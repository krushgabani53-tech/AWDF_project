const { pool } = require('./database');

async function migrateSupportTicketsTable() {
  try {
    console.log('Running safe migration on support_tickets table...');

    // Add ticket_reference column if not exists
    await pool.query(`
      ALTER TABLE support_tickets 
      ADD COLUMN IF NOT EXISTS ticket_reference VARCHAR(100);
    `);

    // Add unique constraint to ticket_reference if not exists
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_ticket_reference_key'
        ) THEN
          ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_ticket_reference_key UNIQUE (ticket_reference);
        END IF;
      END $$;
    `);

    // Add full_name column if not exists (keep existing name column too)
    await pool.query(`
      ALTER TABLE support_tickets 
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
    `);

    // Backfill full_name from name if name exists
    await pool.query(`
      UPDATE support_tickets 
      SET full_name = name 
      WHERE full_name IS NULL AND name IS NOT NULL;
    `);

    // Add priority column if not exists
    await pool.query(`
      ALTER TABLE support_tickets 
      ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Standard';
    `);

    // Add updated_at column if not exists
    await pool.query(`
      ALTER TABLE support_tickets 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    // Ensure status defaults to 'Open'
    await pool.query(`
      ALTER TABLE support_tickets 
      ALTER COLUMN status SET DEFAULT 'Open';
    `);

    console.log('support_tickets table migration completed successfully.');

    // Verify columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'support_tickets' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('support_tickets columns:', columns.rows.map(c => c.column_name));
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrateSupportTicketsTable();

