const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'slate_workspace_jwt_secure_super_secret_key_2026';

// Middleware to verify authentication token
async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check HTTP-only cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from PostgreSQL
    const userResult = await pool.query(
      `SELECT id, name, full_name, email, role, created_at FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'User session expired or user no longer exists.',
      });
    }

    const user = userResult.rows[0];
    req.user = {
      id: user.id,
      name: user.full_name || user.name,
      full_name: user.full_name || user.name,
      email: user.email,
      role: user.role || 'USER',
      created_at: user.created_at,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or malformed authentication token.',
    });
  }
}

// Middleware to verify Admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Administrator privileges required.',
    });
  }
  next();
}

// Optional Auth (attaches req.user if token is present, does not reject if missing)
async function optionalAuth(req, res, next) {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userResult = await pool.query(
        `SELECT id, name, full_name, email, role, created_at FROM users WHERE id = $1`,
        [decoded.userId]
      );
      if (userResult.rowCount > 0) {
        const user = userResult.rows[0];
        req.user = {
          id: user.id,
          name: user.full_name || user.name,
          full_name: user.full_name || user.name,
          email: user.email,
          role: user.role || 'USER',
          created_at: user.created_at,
        };
      }
    }
  } catch (e) {
    // Ignore invalid token in optionalAuth
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth,
};

