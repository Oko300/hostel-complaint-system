const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        matric_number TEXT UNIQUE NOT NULL,
        room_number TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT DEFAULT 'Medium',
        status TEXT DEFAULT 'Pending',
        admin_response TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Seed admin account
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (full_name, email, password, matric_number, room_number, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING;`,
      ['Hostel Admin', 'admin@hostel.com', adminPasswordHash, 'ADMIN001', 'OFFICE', 'admin']
    );

    console.log('Database initialized and admin account seeded.');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1); // Exit if database initialization fails
  }
};

module.exports = { pool, initDB };