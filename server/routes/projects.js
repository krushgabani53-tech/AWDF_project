const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

router.use(optionalAuth);

// Helper to normalize tags array
function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => t.toString().trim().replace(/^#/, '')).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);
  }
  return [];
}

// Helper to generate a unique project code
async function generateUniqueProjectCode(category = '') {
  let prefix = 'PRJ';
  const cat = category.toLowerCase();
  if (cat.includes('backend') || cat.includes('infra') || cat.includes('cloud')) {
    prefix = 'ENG';
  } else if (cat.includes('frontend') || cat.includes('ui') || cat.includes('design')) {
    prefix = 'UI';
  } else if (cat.includes('devops') || cat.includes('smtp') || cat.includes('notif') || cat.includes('email')) {
    prefix = 'NOTIF';
  } else if (cat.includes('data') || cat.includes('ai') || cat.includes('analytics')) {
    prefix = 'DATA';
  } else if (cat.includes('sec') || cat.includes('audit')) {
    prefix = 'SEC';
  }

  const year = new Date().getFullYear();
  let code = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomNum = Math.floor(10 + Math.random() * 90); // 2-digit number (e.g., 07, 45)
    code = `${prefix}-${year}-${randomNum}`;
    const check = await pool.query('SELECT id FROM projects WHERE project_code = $1', [code]);
    if (check.rowCount === 0) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    code = `${prefix}-${year}-${Date.now().toString().slice(-4)}`;
  }
  return code;
}

// 1. GET /api/projects - Retrieve all projects (with optional filters)
router.get('/', async (req, res, next) => {
  const { search, category, status } = req.query;

  try {
    let query = `
      SELECT 
        id, 
        project_code, 
        name, 
        category, 
        description, 
        status, 
        progress, 
        project_lead, 
        TO_CHAR(deadline, 'YYYY-MM-DD') AS deadline, 
        tags, 
        tasks_completed, 
        tasks_total, 
        created_at, 
        updated_at
      FROM projects
    `;

    const whereClauses = [];
    const values = [];

    if (search && search.trim()) {
      values.push(`%${search.trim()}%`);
      whereClauses.push(`(name ILIKE $${values.length} OR project_code ILIKE $${values.length})`);
    }

    if (category && category !== 'All Categories' && category !== 'All Categories (3)') {
      values.push(category);
      whereClauses.push(`category ILIKE $${values.length}`);
    }

    if (status && status !== 'All Statuses' && status !== 'All') {
      values.push(status);
      whereClauses.push(`status ILIKE $${values.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ' ORDER BY id ASC;';

    const result = await pool.query(query, values);

    // Format output data cleanly
    const projects = result.rows.map((row) => ({
      ...row,
      lead: row.project_lead,
      tags: Array.isArray(row.tags) ? row.tags : [],
      tasks: `${row.tasks_completed || 0}/${row.tasks_total || 0}`,
    }));

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/projects/:id - Retrieve a single project
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const isNumeric = /^\d+$/.test(id);
    const query = `
      SELECT 
        id, 
        project_code, 
        name, 
        category, 
        description, 
        status, 
        progress, 
        project_lead, 
        TO_CHAR(deadline, 'YYYY-MM-DD') AS deadline, 
        tags, 
        tasks_completed, 
        tasks_total, 
        created_at, 
        updated_at
      FROM projects
      WHERE ${isNumeric ? 'id = $1' : 'project_code = $1'};
    `;

    const values = [isNumeric ? parseInt(id, 10) : id];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Project with identifier "${id}" not found`,
      });
    }

    const row = result.rows[0];
    const project = {
      ...row,
      lead: row.project_lead,
      tags: Array.isArray(row.tags) ? row.tags : [],
      tasks: `${row.tasks_completed || 0}/${row.tasks_total || 0}`,
    };

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/projects - Create a new project
router.post('/', async (req, res, next) => {
  const {
    name,
    category,
    project_lead,
    lead,
    deadline,
    status = 'Active',
    progress = 0,
    description = '',
    tags = [],
    tasks_completed = 0,
    tasks_total = 0,
    project_code,
  } = req.body;

  // Validation
  const effectiveLead = (project_lead || lead || '').toString().trim();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Project name is required',
    });
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Category is required',
    });
  }
  if (!effectiveLead) {
    return res.status(400).json({
      success: false,
      message: 'Project lead is required',
    });
  }
  if (!deadline) {
    return res.status(400).json({
      success: false,
      message: 'Deadline date is required',
    });
  }

  try {
    const finalProjectCode = project_code && project_code.trim()
      ? project_code.trim().toUpperCase()
      : await generateUniqueProjectCode(category);

    const cleanProgress = Math.max(0, Math.min(100, parseInt(progress, 10) || 0));
    const cleanTags = normalizeTags(tags);

    const insertQuery = `
      INSERT INTO projects (
        project_code,
        name,
        category,
        description,
        status,
        progress,
        project_lead,
        deadline,
        tags,
        tasks_completed,
        tasks_total,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id, 
        project_code, 
        name, 
        category, 
        description, 
        status, 
        progress, 
        project_lead, 
        TO_CHAR(deadline, 'YYYY-MM-DD') AS deadline, 
        tags, 
        tasks_completed, 
        tasks_total, 
        created_at, 
        updated_at;
    `;

    const values = [
      finalProjectCode,
      name.trim(),
      category.trim(),
      description ? description.trim() : '',
      status || 'Active',
      cleanProgress,
      effectiveLead,
      deadline,
      cleanTags,
      parseInt(tasks_completed, 10) || 0,
      parseInt(tasks_total, 10) || 0,
    ];

    const result = await pool.query(insertQuery, values);
    const createdRow = result.rows[0];

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: 'PROJECT_CREATE',
      entityType: 'PROJECT',
      entityId: createdRow.id,
      metadata: { project_code: createdRow.project_code, name: createdRow.name },
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        ...createdRow,
        lead: createdRow.project_lead,
        tasks: `${createdRow.tasks_completed || 0}/${createdRow.tasks_total || 0}`,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation (project_code)
      return res.status(409).json({
        success: false,
        message: 'A project with this project code already exists',
      });
    }
    next(error);
  }
});

// 4. PUT /api/projects/:id - Update an existing project
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    category,
    project_lead,
    lead,
    deadline,
    status,
    progress,
    description,
    tags,
    tasks_completed,
    tasks_total,
  } = req.body;

  try {
    const isNumeric = /^\d+$/.test(id);
    const checkQuery = `SELECT * FROM projects WHERE ${isNumeric ? 'id = $1' : 'project_code = $1'};`;
    const checkRes = await pool.query(checkQuery, [isNumeric ? parseInt(id, 10) : id]);

    if (checkRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Project with identifier "${id}" not found`,
      });
    }

    const current = checkRes.rows[0];

    const newName = name !== undefined && name.trim() ? name.trim() : current.name;
    const newCategory = category !== undefined && category.trim() ? category.trim() : current.category;
    const newLead = (project_lead || lead) !== undefined ? (project_lead || lead).trim() : current.project_lead;
    const newDeadline = deadline !== undefined ? deadline : current.deadline;
    const newStatus = status !== undefined ? status : current.status;
    const newProgress = progress !== undefined ? Math.max(0, Math.min(100, parseInt(progress, 10) || 0)) : current.progress;
    const newDescription = description !== undefined ? description : current.description;
    const newTags = tags !== undefined ? normalizeTags(tags) : current.tags;
    const newTasksCompleted = tasks_completed !== undefined ? parseInt(tasks_completed, 10) || 0 : current.tasks_completed;
    const newTasksTotal = tasks_total !== undefined ? parseInt(tasks_total, 10) || 0 : current.tasks_total;

    const updateQuery = `
      UPDATE projects
      SET
        name = $1,
        category = $2,
        project_lead = $3,
        deadline = $4,
        status = $5,
        progress = $6,
        description = $7,
        tags = $8,
        tasks_completed = $9,
        tasks_total = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING 
        id, 
        project_code, 
        name, 
        category, 
        description, 
        status, 
        progress, 
        project_lead, 
        TO_CHAR(deadline, 'YYYY-MM-DD') AS deadline, 
        tags, 
        tasks_completed, 
        tasks_total, 
        created_at, 
        updated_at;
    `;

    const values = [
      newName,
      newCategory,
      newLead,
      newDeadline,
      newStatus,
      newProgress,
      newDescription,
      newTags,
      newTasksCompleted,
      newTasksTotal,
      current.id,
    ];

    const updateRes = await pool.query(updateQuery, values);
    const updatedRow = updateRes.rows[0];

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: 'PROJECT_UPDATE',
      entityType: 'PROJECT',
      entityId: updatedRow.id,
      metadata: { project_code: updatedRow.project_code, name: updatedRow.name },
    });

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: {
        ...updatedRow,
        lead: updatedRow.project_lead,
        tasks: `${updatedRow.tasks_completed || 0}/${updatedRow.tasks_total || 0}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 5. DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const isNumeric = /^\d+$/.test(id);
    const deleteQuery = `
      DELETE FROM projects
      WHERE ${isNumeric ? 'id = $1' : 'project_code = $1'}
      RETURNING id, project_code, name;
    `;

    const result = await pool.query(deleteQuery, [isNumeric ? parseInt(id, 10) : id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Project with identifier "${id}" not found`,
      });
    }

    const deleted = result.rows[0];
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: 'PROJECT_DELETE',
      entityType: 'PROJECT',
      entityId: deleted.id,
      metadata: { project_code: deleted.project_code, name: deleted.name },
    });

    res.status(200).json({
      success: true,
      message: `Project "${result.rows[0].name}" (${result.rows[0].project_code}) deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
