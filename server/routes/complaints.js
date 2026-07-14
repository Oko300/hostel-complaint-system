const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// POST /api/complaints/submit
router.post('/submit', authenticateToken, async (req, res) => {
  const { title, category, description, priority } = req.body;
  const user_id = req.user.id;

  if (!title || !category || !description) {
    return res.status(400).json({ success: false, message: 'Title, category, and description are required.' });
  }

  const validCategories = ['Electricity', 'Plumbing', 'Furniture', 'Noise', 'Cleanliness', 'Other'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ success: false, message: 'Invalid category.' });
  }

  const validPriorities = ['Low', 'Medium', 'High'];
  const complaintPriority = priority && validPriorities.includes(priority) ? priority : 'Medium';

  try {
    const result = await pool.query(
      'INSERT INTO complaints (user_id, title, category, description, priority) VALUES ($1, $2, $3, $4, $5) RETURNING id, title, category, description, priority, status, created_at',
      [user_id, title, category, description, complaintPriority]
    );

    const newComplaint = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      data: newComplaint,
    });
  } catch (error) {
    console.error('Complaint submission error:', error);
    res.status(500).json({ success: false, message: 'Server error during complaint submission.' });
  }
});

// GET /api/complaints/my
router.get('/my', authenticateToken, async (req, res) => {
  const user_id = req.user.id;
  const { status, category } = req.query;

  try {
    let query = 'SELECT id, title, category, status, priority, created_at, admin_response FROM complaints WHERE user_id = $1';
    const params = [user_id];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    const complaints = result.rows;

    res.status(200).json({
      success: true,
      message: 'User complaints retrieved successfully.',
      data: complaints,
    });
  } catch (error) {
    console.error('Error fetching user complaints:', error);
    res.status(500).json({ success: false, message: 'Server error fetching complaints.' });
  }
});

// GET /api/complaints/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const complaintId = req.params.id;
  const user_id = req.user.id;
  const user_role = req.user.role;

  try {
    const result = await pool.query('SELECT * FROM complaints WHERE id = $1', [complaintId]);
    const complaint = result.rows[0];

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    if (complaint.user_id !== user_id && user_role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this complaint.' });
    }

    res.status(200).json({
      success: true,
      message: 'Complaint retrieved successfully.',
      data: complaint,
    });
  } catch (error) {
    console.error('Error fetching single complaint:', error);
    res.status(500).json({ success: false, message: 'Server error fetching complaint.' });
  }
});

module.exports = router;