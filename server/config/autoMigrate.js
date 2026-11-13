const bcrypt = require('bcryptjs');

async function autoMigrate(pool) {
  try {
    console.log('[AutoMigrate] Verifying database schema and initial data...');

    // 1. Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        full_name VARCHAR(150),
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        role VARCHAR(20) DEFAULT 'USER',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'Medium',
        status VARCHAR(20) DEFAULT 'ongoing',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // 3. Projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        progress INTEGER DEFAULT 0,
        project_lead VARCHAR(100),
        deadline DATE,
        tags TEXT[],
        tasks_completed INTEGER DEFAULT 0,
        tasks_total INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Support Tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_reference VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Open',
        priority VARCHAR(50) DEFAULT 'Standard',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Audit Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Ensure Admin User exists: krushgabani53@gmail.com / Admin123!
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin123!', salt);
    const adminCheck = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER('krushgabani53@gmail.com')`
    );

    if (adminCheck.rowCount === 0) {
      await pool.query(`
        INSERT INTO users (name, full_name, email, password, password_hash, role)
        VALUES ('Krush Gabani', 'Krush Gabani', 'krushgabani53@gmail.com', $1, $1, 'ADMIN')
      `, [adminHash]);
      console.log('[AutoMigrate] Created initial admin: krushgabani53@gmail.com');
    } else {
      await pool.query(`
        UPDATE users 
        SET full_name = 'Krush Gabani',
            password_hash = $1, 
            password = $1,
            role = 'ADMIN'
        WHERE id = $2
      `, [adminHash, adminCheck.rows[0].id]);
      console.log('[AutoMigrate] Verified admin: krushgabani53@gmail.com');
    }

    // 7. Ensure Standard User exists: standard@example.com / Standard123!
    const standardHash = await bcrypt.hash('Standard123!', salt);
    const standardCheck = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER('standard@example.com')`
    );

    if (standardCheck.rowCount === 0) {
      await pool.query(`
        INSERT INTO users (name, full_name, email, password, password_hash, role)
        VALUES ('Standard User', 'Standard User', 'standard@example.com', $1, $1, 'USER')
      `, [standardHash]);
      console.log('[AutoMigrate] Created standard user: standard@example.com');
    }

    // 8. Seed Sample Projects if empty
    const projCheck = await pool.query('SELECT COUNT(*)::int AS count FROM projects');
    if (projCheck.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO projects (project_code, name, category, description, status, progress, project_lead, deadline, tags, tasks_completed, tasks_total)
        VALUES 
        ('ENG-2026-01', 'Enterprise CloudCore Migration', 'Backend & Infrastructure', 'Scalable multi-tenant task processing cluster deployment with distributed cache and audit journaling.', 'Active', 78, 'Krush Gabani', '2026-11-15', ARRAY['AWS', 'Docker', 'MongoDB', 'JWT Auth'], 14, 18),
        ('UI-2026-04', 'Slate Minimalist UI Modernization', 'Frontend Engineering', 'Comprehensive design token unification and micro-interaction revamp across enterprise dashboards.', 'Review', 92, 'Frontend Guild', '2026-10-20', ARRAY['React19', 'Vite', 'Code Splitting', 'Suspense'], 23, 25),
        ('NOTIF-2026-09', 'Automated SMTP Telemetry Dispatcher', 'Integrations & DevOps', 'High-throughput outbound transactional alert dispatcher with fallover and rate monitoring.', 'Maintenance', 45, 'Security Ops', '2026-12-05', ARRAY['Node.js', 'PostgreSQL', 'SMTP', 'Audit Logging'], 9, 20);
      `);
      console.log('[AutoMigrate] Seeded initial sample projects.');
    }

    console.log('[AutoMigrate] Database schema & seed data ready.');
  } catch (err) {
    console.error('[AutoMigrate] Error during auto-migration:', err.message);
  }
}

module.exports = { autoMigrate };

