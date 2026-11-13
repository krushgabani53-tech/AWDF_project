const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'slate_workspace_jwt_secure_super_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Simple in-memory rate limiter for failed login attempts
const failedAttempts = new Map();

function isRateLimited(ip) {
  const record = failedAttempts.get(ip);
  if (!record) return false;
  const now = Date.now();
  // 5 failed attempts in 5 minutes locks for 5 minutes
  if (record.count >= 5 && now - record.lastAttempt < 5 * 60 * 1000) {
    return true;
  }
  if (now - record.lastAttempt >= 5 * 60 * 1000) {
    failedAttempts.delete(ip);
    return false;
  }
  return false;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = failedAttempts.get(ip) || { count: 0, lastAttempt: now };
  record.count += 1;
  record.lastAttempt = now;
  failedAttempts.set(ip, record);
}

function clearFailedAttempts(ip) {
  failedAttempts.delete(ip);
}

// 1. POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const { full_name, name, email, password, confirmPassword } = req.body;
  const effectiveName = (full_name || name || '').toString().trim();
  const effectiveEmail = (email || '').toString().trim().toLowerCase();

  // Validation
  if (!effectiveName) {
    return res.status(400).json({
      success: false,
      message: 'Full Name is required',
    });
  }

  if (!effectiveEmail) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(effectiveEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address (e.g. user@example.com)',
    });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long',
    });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match',
    });
  }

  try {
    // Check duplicate email
    const existing = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
      [effectiveEmail]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Enforce Standard role for all public registrations
    const role = 'USER';

    const insertQuery = `
      INSERT INTO users (name, full_name, email, password, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, full_name, email, role, created_at;
    `;
    const result = await pool.query(insertQuery, [
      effectiveName,
      effectiveName,
      effectiveEmail,
      passwordHash,
      passwordHash,
      role,
    ]);

    const newUser = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Audit Log
    await logAudit({
      userId: newUser.id,
      action: 'USER_REGISTER',
      entityType: 'USER',
      entityId: newUser.id,
      metadata: { email: newUser.email, role: newUser.role },
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.full_name || newUser.name,
        full_name: newUser.full_name || newUser.name,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      message: 'Too many failed login attempts. Please try again in 5 minutes.',
    });
  }

  const { email, password, remember_me } = req.body;
  const effectiveEmail = (email || '').toString().trim().toLowerCase();

  if (!effectiveEmail || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email address and password are required',
    });
  }

  try {
    const userResult = await pool.query(
      `SELECT id, name, full_name, email, password, password_hash, role, created_at FROM users WHERE LOWER(email) = LOWER($1)`,
      [effectiveEmail]
    );

    if (userResult.rowCount === 0) {
      recordFailedAttempt(clientIp);
      await logAudit({
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        metadata: { email: effectiveEmail, ip: clientIp, reason: 'User not found' },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password',
      });
    }

    const user = userResult.rows[0];
    const storedHash = user.password_hash || user.password;

    const isMatch = await bcrypt.compare(password, storedHash);

    if (!isMatch) {
      recordFailedAttempt(clientIp);
      await logAudit({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: user.id,
        metadata: { email: effectiveEmail, ip: clientIp, reason: 'Password mismatch' },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password',
      });
    }

    // Login succeeded: clear rate limiter
    clearFailedAttempts(clientIp);

    const maxAgeMs = remember_me
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 24 * 60 * 60 * 1000; // 1 day

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: remember_me ? '30d' : '1d' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeMs,
    });

    // Audit Log
    await logAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: user.id,
      metadata: { email: user.email, role: user.role, ip: clientIp },
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.full_name || user.name,
        full_name: user.full_name || user.name,
        email: user.email,
        role: user.role || 'USER',
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/auth/logout
router.post('/logout', optionalAuth, async (req, res) => {
  if (req.user) {
    await logAudit({
      userId: req.user.id,
      action: 'USER_LOGOUT',
      entityType: 'AUTH',
      entityId: req.user.id,
      metadata: { email: req.user.email },
    });
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// 4. GET /api/auth/me - Verify session and return current user
router.get('/me', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

module.exports = router;

