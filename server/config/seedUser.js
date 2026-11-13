const { pool } = require('./database');

async function seedDefaultUser() {
  try {
    const query = `
      INSERT INTO users (id, name, email, password, role)
      VALUES (1, 'Krush Gabani', 'krushgabani53@gmail.com', 'dev_password_hash', 'USER')
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        email = EXCLUDED.email
      RETURNING *;
    `;
    const res = await pool.query(query);
    console.log('Default user ready:', res.rows[0]);
  } catch (err) {
    console.error('Error seeding default user:', err.message);
  } finally {
    await pool.end();
  }
}

seedDefaultUser();

