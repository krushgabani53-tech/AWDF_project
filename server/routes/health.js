const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { autoMigrate } = require('../config/autoMigrate');

// GET /api/health
router.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT 1 AS alive');
    const isDbAlive = dbRes.rows.length > 0;

    res.status(200).json({
      success: true,
      message: 'Slate Workspace backend is running',
      database: isDbAlive ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Slate Workspace backend is running',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// GET /api/setup-db - Idempotent database schema & initial data setup
router.get('/setup-db', async (req, res) => {
  try {
    await autoMigrate(pool);

    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const users = await pool.query('SELECT id, name, email, role FROM users;');

    res.status(200).json({
      success: true,
      message: 'Database tables verified and seeded successfully',
      tables: tables.rows.map(t => t.table_name),
      users: users.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database setup failed',
      error: error.message,
    });
  }
});

module.exports = router;
