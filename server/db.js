const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../hostel.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

const setupDatabase = () => {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      matric_number TEXT UNIQUE NOT NULL,
      room_number TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create complaints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Pending',
      admin_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default admin account
  const adminEmail = 'admin@hostel.com';
  const adminPassword = 'admin123'; // This will be hashed
  const adminFullName = 'Hostel Admin';
  const adminMatricNumber = 'ADMIN001';
  const adminRoomNumber = 'OFFICE';
  const adminRole = 'admin';

  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      'INSERT INTO users (full_name, email, password, matric_number, room_number, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminFullName, adminEmail, hashedPassword, adminMatricNumber, adminRoomNumber, adminRole);
    console.log('Default admin account seeded.');
  } else {
    console.log('Default admin account already exists.');
  }
};

setupDatabase();

module.exports = db;