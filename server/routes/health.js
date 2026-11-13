const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/health
router.get('/health', async (req, res) => {
  try {
    // Optionally verify database connectivity as well
    const dbRes = await pool.query('SELECT 1 AS alive');
    const isDbAlive = dbRes.rows.length > 0;

    res.status(200).json({
      success: true,
      message: 'Slate Workspace backend is running',
      database: isDbAlive ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Return health even if DB has issues or return with db warning
    res.status(200).json({
      success: true,
      message: 'Slate Workspace backend is running',
      database: 'disconnected',
      error: error.message,
    });
  }
});

module.exports = router;

