const { pool } = require('./database');
const bcrypt = require('bcryptjs');

async function migratePhase6() {
  try {
    console.log('Running safe migration for Phase 6 (Auth, RBAC, Audit Logs)...');

    // 1. Update users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
    `);

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    `);

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    // Backfill full_name from name
    await pool.query(`
      UPDATE users 
      SET full_name = name 
      WHERE full_name IS NULL AND name IS NOT NULL;
    `);

    // 2. Create audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add indexes for audit log queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    `);

    // 3. Seed/Update Initial Admin Account: krushgabani53@gmail.com with password 'Admin123!'
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('Admin123!', salt);

    // Upsert admin user
    const adminCheck = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER('krushgabani53@gmail.com')`
    );

    if (adminCheck.rowCount === 0) {
      await pool.query(`
        INSERT INTO users (name, full_name, email, password, password_hash, role)
        VALUES ('Krush Gabani', 'Krush Gabani', 'krushgabani53@gmail.com', $1, $1, 'ADMIN')
      `, [adminPasswordHash]);
      console.log('Admin user krushgabani53@gmail.com created with role ADMIN.');
    } else {
      await pool.query(`
        UPDATE users 
        SET full_name = 'Krush Gabani', 
            password_hash = $1, 
            password = $1,
            role = 'ADMIN'
        WHERE id = $2
      `, [adminPasswordHash, adminCheck.rows[0].id]);
      console.log('Admin user krushgabani53@gmail.com updated with password hash and ADMIN role.');
    }

    // Sync users_id_seq with MAX(id)
    await pool.query(`
      SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
    `);

    // Also seed a Standard Test User: standard@example.com with password 'Standard123!'
    const standardPasswordHash = await bcrypt.hash('Standard123!', salt);
    const stdCheck = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER('standard@example.com')`
    );

    if (stdCheck.rowCount === 0) {
      await pool.query(`
        INSERT INTO users (name, full_name, email, password, password_hash, role)
        VALUES ('Jane Developer', 'Jane Developer', 'standard@example.com', $1, $1, 'USER')
      `, [standardPasswordHash]);
      console.log('Standard user standard@example.com created with role USER.');
    }

    // 4. Log initial system migration in audit_logs
    await pool.query(`
      INSERT INTO audit_logs (action, entity_type, metadata)
      VALUES ('SYSTEM_INIT', 'SYSTEM', '{"event": "Phase 6 security & audit log initialized"}'::jsonb);
    `);

    console.log('Phase 6 migration and seed completed successfully.');
  } catch (err) {
    console.error('Phase 6 migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migratePhase6();
