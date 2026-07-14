const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'; // Fallback for development

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { full_name, email, password, matric_number, room_number } = req.body;

  // Basic input validation
  if (!full_name || !email || !password || !matric_number || !room_number) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (full_name, email, password, matric_number, room_number) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, matric_number, room_number, role',
      [full_name, email, hashedPassword, matric_number, room_number]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { user: newUser, token },
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation error code for PostgreSQL
      return res.status(409).json({ success: false, message: 'Email or Matric Number already registered.' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user; // Exclude password from response

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: { user: userWithoutPassword, token },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

module.exports = router;