const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// Use optionalAuth so authenticated users get strict isolation, while unauthenticated dev tests default cleanly to user_id = 1
router.use(optionalAuth);

const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

// Helper to format priority string cleanly (e.g., 'Medium')
function formatPriority(priority) {
  if (!priority) return 'Medium';
  const clean = priority.toString().trim().replace(/ Priority$/i, '').toLowerCase();
  if (VALID_PRIORITIES.includes(clean)) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return 'Medium';
}

// 1. GET /api/tasks - Retrieve tasks (User Isolated: Standard users only see their own; Admins see all)
router.get('/', async (req, res, next) => {
  try {
    const isAuthed = Boolean(req.user);
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const currentUserId = req.user ? req.user.id : 1;

    let query = `
      SELECT id, user_id, title, description, priority, status, created_at, completed_at
      FROM tasks
    `;
    const values = [];

    if (!isAdmin) {
      // Isolate to current user's tasks
      values.push(currentUserId);
      query += ` WHERE user_id = $1`;
    }

    query += ' ORDER BY id DESC;';

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

// 2. GET /api/tasks/:id - Retrieve specific task
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const currentUserId = req.user ? req.user.id : 1;

    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Task with id ${id} not found`,
      });
    }

    const task = result.rows[0];

    // Data isolation check: non-admin cannot view others' tasks
    if (!isAdmin && task.user_id && task.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own tasks.',
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/tasks - Create new task
router.post('/', async (req, res, next) => {
  const { title, description, priority, user_id } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Task title is required and must be at least 3 characters',
    });
  }

  const cleanTitle = title.trim();
  const cleanDescription = description && typeof description === 'string' ? description.trim() : '';
  const cleanPriority = formatPriority(priority);
  // Prioritize authenticated user ID, fallback to provided user_id or dev default 1
  const targetUserId = req.user ? req.user.id : user_id || 1;

  try {
    const query = `
      INSERT INTO tasks (user_id, title, description, priority, status, created_at)
      VALUES ($1, $2, $3, $4, 'ongoing', CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [targetUserId, cleanTitle, cleanDescription, cleanPriority];
    const result = await pool.query(query, values);
    const createdTask = result.rows[0];

    // Audit log
    await logAudit({
      userId: targetUserId,
      action: 'TASK_CREATE',
      entityType: 'TASK',
      entityId: createdTask.id,
      metadata: { title: createdTask.title, priority: createdTask.priority },
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: createdTask,
    });
  } catch (error) {
    next(error);
  }
});

// 4. PUT /api/tasks/:id - Update an ongoing task (User Isolated & Protocol 5 Enforced)
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { title, description, priority, status } = req.body;

  try {
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const currentUserId = req.user ? req.user.id : 1;

    // 1. Fetch current task to check existence and status
    const checkResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Task with id ${id} not found`,
      });
    }

    const currentTask = checkResult.rows[0];

    // User Data Isolation check: non-admin cannot modify someone else's task
    if (!isAdmin && currentTask.user_id && currentTask.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit your own tasks.',
      });
    }

    // 2. Enforce Protocol 5: Completed tasks cannot be edited
    if (currentTask.status === 'completed') {
      return res.status(403).json({
        success: false,
        message: 'Protocol 5 Violation: Completed tasks are permanently locked and cannot be edited.',
      });
    }

    // 3. Enforce Protocol 5: Prevent changing completed task back to ongoing
    if (status && status.toLowerCase() === 'ongoing' && currentTask.status === 'completed') {
      return res.status(403).json({
        success: false,
        message: 'Protocol 5 Violation: Completed tasks cannot be transitioned back to ongoing.',
      });
    }

    // 4. Validate title if provided
    let newTitle = currentTask.title;
    if (title !== undefined) {
      if (!title || typeof title !== 'string' || title.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Task title must be at least 3 characters',
        });
      }
      newTitle = title.trim();
    }

    const newDescription =
      description !== undefined && typeof description === 'string'
        ? description.trim()
        : currentTask.description;

    const newPriority = priority !== undefined ? formatPriority(priority) : currentTask.priority;

    // 5. Update task (status remains ongoing)
    const updateQuery = `
      UPDATE tasks
      SET title = $1, description = $2, priority = $3
      WHERE id = $4
      RETURNING *;
    `;
    const updateResult = await pool.query(updateQuery, [newTitle, newDescription, newPriority, id]);
    const updatedTask = updateResult.rows[0];

    // Audit log
    await logAudit({
      userId: currentUserId,
      action: 'TASK_UPDATE',
      entityType: 'TASK',
      entityId: updatedTask.id,
      metadata: { title: updatedTask.title, priority: updatedTask.priority },
    });

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
});

// 5. PATCH /api/tasks/:id/complete - Mark task as completed (Protocol 5)
router.patch('/:id/complete', async (req, res, next) => {
  const { id } = req.params;

  try {
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const currentUserId = req.user ? req.user.id : 1;

    const checkResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Task with id ${id} not found`,
      });
    }

    const currentTask = checkResult.rows[0];

    // User Data Isolation check: non-admin cannot complete someone else's task
    if (!isAdmin && currentTask.user_id && currentTask.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only complete your own tasks.',
      });
    }

    // If already completed, cannot re-complete or modify
    if (currentTask.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Protocol 5 Violation: Task is already completed and permanently locked.',
      });
    }

    const completeQuery = `
      UPDATE tasks
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const updateResult = await pool.query(completeQuery, [id]);
    const completedTask = updateResult.rows[0];

    // Audit log
    await logAudit({
      userId: currentUserId,
      action: 'TASK_COMPLETE',
      entityType: 'TASK',
      entityId: completedTask.id,
      metadata: { title: completedTask.title },
    });

    res.status(200).json({
      success: true,
      message: 'Task marked as completed (locked under Protocol 5)',
      data: completedTask,
    });
  } catch (error) {
    next(error);
  }
});

// 6. DELETE /api/tasks/:id - Delete an ongoing task (User Isolated & Protocol 5 Enforced)
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const currentUserId = req.user ? req.user.id : 1;

    const checkResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Task with id ${id} not found`,
      });
    }

    const currentTask = checkResult.rows[0];

    // User Data Isolation check
    if (!isAdmin && currentTask.user_id && currentTask.user_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own tasks.',
      });
    }

    // Enforce Protocol 5: Completed tasks cannot be deleted through standard task operations
    if (currentTask.status === 'completed') {
      return res.status(403).json({
        success: false,
        message: 'Protocol 5 Violation: Completed tasks are permanently locked and cannot be deleted.',
      });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    // Audit log
    await logAudit({
      userId: currentUserId,
      action: 'TASK_DELETE',
      entityType: 'TASK',
      entityId: id,
      metadata: { title: currentTask.title },
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
