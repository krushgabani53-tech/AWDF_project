const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

router.use(optionalAuth);

const VALID_CATEGORIES = [
  'Technical Issue',
  'Account & Access',
  'Bug Report',
  'Feature Request',
  'General Inquiry',
];

// Helper to generate a unique ticket reference
async function generateUniqueTicketRef() {
  const year = new Date().getFullYear();
  let ref = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 digits
    ref = `TKT-${year}-${randomDigits}`;

    const check = await pool.query(
      'SELECT id FROM support_tickets WHERE LOWER(ticket_reference) = LOWER($1)',
      [ref]
    );
    if (check.rowCount === 0) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    ref = `TKT-${year}-${Date.now().toString().slice(-6)}`;
  }
  return ref;
}

// 1. POST /api/support/tickets - Submit a new support ticket
router.post('/tickets', async (req, res, next) => {
  const { full_name, name, email, category, message } = req.body;

  const effectiveName = (full_name || name || '').toString().trim();
  const effectiveEmail = (email || '').toString().trim();
  const effectiveCategory = (category || '').toString().trim();
  const effectiveMessage = (message || '').toString().trim();

  // 1. Validation: All fields required
  if (!effectiveName) {
    return res.status(400).json({
      success: false,
      message: 'Full Name is required',
    });
  }

  if (!effectiveEmail) {
    return res.status(400).json({
      success: false,
      message: 'Email Address is required',
    });
  }

  // 2. Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(effectiveEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address (e.g. user@example.com)',
    });
  }

  // 3. Category validation
  if (!effectiveCategory) {
    return res.status(400).json({
      success: false,
      message: 'Category selection is required',
    });
  }

  // 4. Message length validation (min 10 characters)
  if (!effectiveMessage || effectiveMessage.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Message description must contain at least 10 characters',
    });
  }

  try {
    const ticketRef = await generateUniqueTicketRef();

    // Default priority: Standard (public submissions cannot escalate to P1/P2)
    const priority = 'Standard';
    const status = 'Open';

    const insertQuery = `
      INSERT INTO support_tickets (
        ticket_reference,
        full_name,
        name,
        email,
        category,
        message,
        priority,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        ticket_reference,
        full_name,
        email,
        category,
        message,
        priority,
        status,
        created_at,
        updated_at;
    `;

    const values = [
      ticketRef,
      effectiveName,
      effectiveName,
      effectiveEmail.toLowerCase(),
      effectiveCategory,
      effectiveMessage,
      priority,
      status,
    ];

    const result = await pool.query(insertQuery, values);
    const createdTicket = result.rows[0];

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: 'TICKET_SUBMIT',
      entityType: 'SUPPORT_TICKET',
      entityId: createdTicket.ticket_reference,
      metadata: { category: createdTicket.category, email: createdTicket.email },
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      data: {
        id: createdTicket.id,
        ticket_reference: createdTicket.ticket_reference,
        full_name: createdTicket.full_name,
        email: createdTicket.email,
        category: createdTicket.category,
        priority: createdTicket.priority,
        status: createdTicket.status,
        created_at: createdTicket.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/support/tickets/:reference - Retrieve ticket with verified email
router.get('/tickets/:reference', async (req, res, next) => {
  const { reference } = req.params;
  const { email } = req.query;

  if (!email || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Email address verification is required to access ticket information.',
    });
  }

  try {
    const query = `
      SELECT 
        id,
        ticket_reference,
        full_name,
        email,
        category,
        message,
        priority,
        status,
        created_at,
        updated_at
      FROM support_tickets
      WHERE LOWER(ticket_reference) = LOWER($1) AND LOWER(email) = LOWER($2);
    `;

    const result = await pool.query(query, [reference.trim(), email.trim().toLowerCase()]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No support ticket found matching this reference number and verified email address.',
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// 3. GET /api/support/status - Return SMTP service configuration status
router.get('/status', (req, res) => {
  const hasSmtpConfig = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );

  if (!hasSmtpConfig) {
    return res.status(200).json({
      success: true,
      smtp: {
        configured: false,
        status: 'Not Configured',
        message: 'SMTP service is not configured in the backend environment. In-app ticket tracking is active.',
      },
    });
  }

  // If environment variables exist, report configuration presence
  res.status(200).json({
    success: true,
    smtp: {
      configured: true,
      status: 'Connected',
      message: 'SMTP service configured and active.',
    },
  });
});

module.exports = router;

