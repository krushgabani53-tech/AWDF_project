const { pool } = require('./database');

async function migrateProjectsTable() {
  try {
    console.log('Running safe migration on projects table...');

    // Add tags column if not exists
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `);

    // Add tasks_completed column if not exists
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS tasks_completed INTEGER DEFAULT 0;
    `);

    // Add tasks_total column if not exists
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS tasks_total INTEGER DEFAULT 0;
    `);

    // Add updated_at column if not exists
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    console.log('Projects table migration complete.');

    // Seed the 3 initial projects with ON CONFLICT (project_code) DO NOTHING
    const seedQuery = `
      INSERT INTO projects (
        project_code, name, category, description, status, progress, project_lead, deadline, tags, tasks_completed, tasks_total
      ) VALUES 
      (
        'ENG-2026-01',
        'Enterprise CloudCore Migration',
        'Backend & Infrastructure',
        'Scalable multi-tenant task processing cluster deployment with distributed cache and audit journaling.',
        'Active',
        78,
        'Krush Gabani',
        '2026-11-15',
        ARRAY['AWS', 'Docker', 'MongoDB', 'JWT Auth'],
        14,
        18
      ),
      (
        'UI-2026-04',
        'Slate Minimalist UI Modernization',
        'Frontend Engineering',
        'Implementation of route-based code splitting, lazy loading, and DevTools Network optimization.',
        'Review',
        92,
        'Frontend Guild',
        '2026-10-20',
        ARRAY['React19', 'Vite', 'Code Splitting', 'Suspense'],
        23,
        25
      ),
      (
        'NOTIF-2026-09',
        'Automated SMTP Telemetry Dispatcher',
        'Integrations & DevOps',
        'Automated executive email delivery via Nodemailer with Gmail App Passwords and SSL handshake.',
        'Active',
        60,
        'Security Ops',
        '2026-12-05',
        ARRAY['Nodemailer', 'SMTP', 'HTML Reports', 'CRON'],
        6,
        10
      )
      ON CONFLICT (project_code) DO NOTHING
      RETURNING *;
    `;

    const seedRes = await pool.query(seedQuery);
    console.log(`Seeded ${seedRes.rowCount} new projects (if 0, projects were already seeded).`);

    // Check all current projects
    const all = await pool.query('SELECT project_code, name, status, progress FROM projects ORDER BY id ASC;');
    console.log('Current projects in database:', all.rows);
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrateProjectsTable();

