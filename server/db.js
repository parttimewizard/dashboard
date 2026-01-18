const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  try {
    // Create Groups Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Services Table (if not exists)
    const queryText = `
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(255) NOT NULL,
        icon VARCHAR(255),
        category VARCHAR(100),
        is_quick_access BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'unknown',
        last_checked TIMESTAMP
      );
    `;
    await pool.query(queryText);

    // Create Service History Table (Moved up to ensure creation)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_history (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        status VARCHAR(20),
        latency INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_history_service_id ON service_history(service_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_history_created_at ON service_history(created_at);`);

    // Create Service Groups Join Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_groups (
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        PRIMARY KEY (service_id, group_id)
      );
    `);

    // Create App Config Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT
      );
    `);
    
    // Seed default title if not exists
    await pool.query(`
        INSERT INTO app_config (key, value) VALUES ('dashboard_title', 'Home Server') 
        ON CONFLICT DO NOTHING
    `);

    // Create Locations Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrations / Ensure Columns Exist
    const migrations = [
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL",
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unknown'",
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS last_checked TIMESTAMP",
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL",
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS monitoring_type VARCHAR(20) DEFAULT 'http'",
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS snmp_host VARCHAR(255)",
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS snmp_community VARCHAR(255) DEFAULT 'public'",
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS snmp_oid VARCHAR(255)",
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS last_stats JSONB",
      // New Column for Host Dependency
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS host_id INTEGER REFERENCES services(id) ON DELETE SET NULL",
      "ALTER TABLE services ALTER COLUMN url DROP NOT NULL",
      // Phase 8: Advanced Monitoring (Proxmox/Glances)
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS api_key TEXT", 
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS target_node VARCHAR(255)", 
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS target_vmid INTEGER",
      // Separate monitoring URL
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS monitoring_url VARCHAR(255)",
      // Brand icon column
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS brand_icon VARCHAR(100)"
    ];

    for (const migration of migrations) {
      await pool.query(migration);
    }
    
    // Migrate existing group_id to service_groups if needed
    try {
        const check = await pool.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'services' AND column_name = 'group_id'
        `);
        if (check.rows.length > 0) {
            console.log('Migrating legacy group_id...');
            await pool.query(`
                INSERT INTO service_groups (service_id, group_id)
                SELECT id, group_id FROM services 
                WHERE group_id IS NOT NULL
                ON CONFLICT DO NOTHING
            `);
            // We do NOT drop the column yet to be safe, but we stop using it in the code.
            // Or we can drop it if we are confident. Let's keep it for now as "legacy".
        }
    } catch (e) {
        console.error('Migration error:', e);
    }

    console.log('Database initialized: Tables created/verified.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

module.exports = { pool, initDb };