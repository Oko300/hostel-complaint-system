const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Middleware to check if user is admin
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// GET /api/admin/complaints
router.get('/complaints', authenticateToken, authorizeAdmin, (req, res) => {
  const { status, category } = req.query;
  let query = `
    SELECT
      c.id, c.title, c.category, c.description, c.priority, c.status, c.admin_response, c.created_at, c.updated_at,
      u.full_name, u.room_number, u.matric_number, u.email
    FROM complaints c
    JOIN users u ON c.user_id = u.id
  `;
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }
  if (category) {
    conditions.push('c.category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY c.created_at DESC';

  try {
    const complaints = db.prepare(query).all(...params);
    res.status(200).json({
      success: true,
      message: 'All complaints retrieved successfully.',
      data: complaints,
    });
  } catch (error) {
    console.error('Error fetching all complaints for admin:', error);
    res.status(500).json({ success: false, message: 'Server error fetching complaints.' });
  }
});

// PATCH /api/admin/complaints/:id
router.patch('/complaints/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const complaintId = req.params.id;
  const { status, admin_response } = req.body;

  if (!status && !admin_response) {
    return res.status(400).json({ success: false, message: 'At least one of status or admin_response is required.' });
  }

  const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  let query = 'UPDATE complaints SET updated_at = CURRENT_TIMESTAMP';
  const params = [];

  if (status) {
    query += ', status = ?';
    params.push(status);
  }
  if (admin_response !== undefined) { // Allow admin_response to be null/empty string
    query += ', admin_response = ?';
    params.push(admin_response);
  }

  query += ' WHERE id = ?';
  params.push(complaintId);

  try {
    const stmt = db.prepare(query);
    const info = stmt.run(...params);

    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found or no changes made.' });
    }

    const updatedComplaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully.',
      data: updatedComplaint,
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ success: false, message: 'Server error updating complaint.' });
  }
});

// GET /api/admin/stats
router.get('/stats', authenticateToken, authorizeAdmin, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) AS count FROM complaints').get().count;
    const pending = db.prepare("SELECT COUNT(*) AS count FROM complaints WHERE status = 'Pending'").get().count;
    const inProgress = db.prepare("SELECT COUNT(*) AS count FROM complaints WHERE status = 'In Progress'").get().count;
    const resolved = db.prepare("SELECT COUNT(*) AS count FROM complaints WHERE status = 'Resolved'").get().count;
    const rejected = db.prepare("SELECT COUNT(*) AS count FROM complaints WHERE status = 'Rejected'").get().count;

    const byCategoryRaw = db.prepare('SELECT category, COUNT(*) AS count FROM complaints GROUP BY category').all();
    const byCategory = byCategoryRaw.reduce((acc, item) => {
      acc[item.category] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Complaint statistics retrieved successfully.',
      data: {
        total,
        pending,
        inProgress,
        resolved,
        rejected,
        byCategory,
      },
    });
  } catch (error) {
    console.error('Error fetching complaint statistics:', error);
    res.status(500).json({ success: false, message: 'Server error fetching statistics.' });
  }
});

// GET /api/admin/reports
router.get('/reports', authenticateToken, authorizeAdmin, (req, res) => {
  const { from_date, to_date } = req.query;
  let query = `
    SELECT
      c.id, c.title, c.category, c.description, c.priority, c.status, c.admin_response, c.created_at, c.updated_at,
      u.full_name, u.room_number, u.matric_number, u.email
    FROM complaints c
    JOIN users u ON c.user_id = u.id
  `;
  const params = [];
  const conditions = [];

  if (from_date) {
    conditions.push('c.created_at >= ?');
    params.push(from_date);
  }
  if (to_date) {
    conditions.push('c.created_at <= ?');
    params.push(to_date);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY c.created_at DESC';

  try {
    const reports = db.prepare(query).all(...params);
    res.status(200).json({
      success: true,
      message: 'Complaint reports retrieved successfully.',
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching complaint reports:', error);
    res.status(500).json({ success: false, message: 'Server error fetching reports.' });
  }
});

module.exports = router;