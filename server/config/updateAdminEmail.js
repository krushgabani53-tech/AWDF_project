const { pool } = require('./database');

async function updateAllReferences() {
  try {
    // 1. Users
    await pool.query(`
      UPDATE users 
      SET email = 'krushgabani53@gmail.com', 
          name = 'Krush Gabani', 
          full_name = 'Krush Gabani',
          updated_at = CURRENT_TIMESTAMP
      WHERE email = 'kirtanjogani612@gmail.com' OR email = 'krushgabani53@gmail.com';
    `);

    // 2. Projects
    await pool.query(`
      UPDATE projects 
      SET project_lead = 'Krush Gabani' 
      WHERE project_lead = 'Kirtan Jogani';
    `);

    // 3. Support Tickets
    await pool.query(`
      UPDATE support_tickets 
      SET full_name = 'Krush Gabani', email = 'krushgabani53@gmail.com' 
      WHERE full_name = 'Kirtan Jogani' OR email = 'kirtanjogani612@gmail.com';
    `);

    // 4. Audit Logs metadata
    await pool.query(`
      UPDATE audit_logs 
      SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{email}', '"krushgabani53@gmail.com"')
      WHERE metadata->>'email' = 'kirtanjogani612@gmail.com';
    `);

    console.log('All database references successfully updated to Krush Gabani / krushgabani53@gmail.com');
    process.exit(0);
  } catch (err) {
    console.error('Error updating references:', err);
    process.exit(1);
  }
}

updateAllReferences();
