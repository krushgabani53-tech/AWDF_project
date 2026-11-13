const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// All admin routes require authentication and Admin role
router.use(authenticate, requireAdmin);

// 1. GET /api/admin/stats - Overview metrics
router.get('/stats', async (req, res, next) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    const tasksCount = await pool.query('SELECT COUNT(*)::int AS count FROM tasks');
    const ongoingTasks = await pool.query("SELECT COUNT(*)::int AS count FROM tasks WHERE status = 'ongoing'");
    const completedTasks = await pool.query("SELECT COUNT(*)::int AS count FROM tasks WHERE status = 'completed'");
    const projectsCount = await pool.query('SELECT COUNT(*)::int AS count FROM projects');
    const ticketsCount = await pool.query('SELECT COUNT(*)::int AS count FROM support_tickets');

    const recentActivity = await pool.query(`
      SELECT 
        a.id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.metadata,
        a.created_at,
        u.email AS user_email,
        u.name AS user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 8;
    `);

    res.status(200).json({
      success: true,
      data: {
        total_users: usersCount.rows[0].count,
        total_tasks: tasksCount.rows[0].count,
        ongoing_tasks: ongoingTasks.rows[0].count,
        completed_tasks: completedTasks.rows[0].count,
        total_projects: projectsCount.rows[0].count,
        total_support_tickets: ticketsCount.rows[0].count,
        recent_activity: recentActivity.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/admin/users - User directory
router.get('/users', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id, name, full_name, email, role, created_at, updated_at
      FROM users
      ORDER BY id ASC;
    `);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// 3. PATCH /api/admin/users/:id/role - Change user role
router.patch('/users/:id/role', async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.body;

  const targetRole = (role || '').toString().toUpperCase().trim();
  if (!['USER', 'ADMIN'].includes(targetRole)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Allowed roles are "USER" or "ADMIN".',
    });
  }

  try {
    const targetId = parseInt(id, 10);
    const userRes = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [targetId]);

    if (userRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${id} not found`,
      });
    }

    const targetUser = userRes.rows[0];

    // Prevent self-demotion if the admin is the only admin
    if (targetUser.id === req.user.id && targetRole !== 'ADMIN') {
      const adminCountRes = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'ADMIN'");
      if (adminCountRes.rows[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove your own admin role because you are the only remaining administrator.',
        });
      }
    }

    const updateRes = await pool.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, role, updated_at;`,
      [targetRole, targetId]
    );

    // Audit log
    await logAudit({
      userId: req.user.id,
      action: 'ROLE_CHANGE',
      entityType: 'USER',
      entityId: targetId,
      metadata: { targetEmail: targetUser.email, oldRole: targetUser.role, newRole: targetRole },
    });

    res.status(200).json({
      success: true,
      message: `User role successfully updated to ${targetRole}.`,
      data: updateRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// 4. GET /api/admin/audit-logs - Query and filter audit trail
router.get('/audit-logs', async (req, res, next) => {
  const { startDate, endDate, action, search } = req.query;

  try {
    let query = `
      SELECT 
        a.id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.metadata,
        a.created_at,
        u.email AS user_email,
        u.name AS user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;

    const whereClauses = [];
    const values = [];

    if (startDate) {
      values.push(startDate);
      whereClauses.push(`a.created_at >= $${values.length}::timestamptz`);
    }

    if (endDate) {
      values.push(endDate);
      whereClauses.push(`a.created_at <= $${values.length}::timestamptz + interval '1 day'`);
    }

    if (action && action !== 'ALL') {
      values.push(action);
      whereClauses.push(`a.action ILIKE $${values.length}`);
    }

    if (search && search.trim()) {
      values.push(`%${search.trim()}%`);
      whereClauses.push(`(
        a.action ILIKE $${values.length} OR 
        a.entity_type ILIKE $${values.length} OR 
        u.email ILIKE $${values.length} OR
        u.name ILIKE $${values.length}
      )`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ' ORDER BY a.created_at DESC LIMIT 100;';

    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// 5. GET /api/admin/support-tickets - Review all workspace support tickets
router.get('/support-tickets', async (req, res, next) => {
  try {
    const result = await pool.query(`
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
      ORDER BY created_at DESC;
    `);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

