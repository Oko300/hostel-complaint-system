const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// Middleware to check if user is admin
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// GET /api/admin/complaints
router.get('/complaints', authenticateToken, authorizeAdmin, async (req, res) => {
  const { status, category, search } = req.query;
  let query = `
    SELECT
      c.id, c.title, c.category, c.description, c.priority, c.status, c.admin_response, c.created_at, c.updated_at,
      u.full_name AS user_full_name, u.room_number AS user_room_number, u.matric_number AS user_matric_number, u.email AS user_email
    FROM complaints c
    JOIN users u ON c.user_id = u.id
  `;
  const params = [];
  const conditions = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`c.status = $${paramIndex++}`);
    params.push(status);
  }
  if (category) {
    conditions.push(`c.category = $${paramIndex++}`);
    params.push(category);
  }
  if (search) {
    conditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex} OR u.matric_number ILIKE $${paramIndex++})`);
    params.push(`%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY c.created_at DESC';

  try {
    const result = await pool.query(query, params);
    const complaints = result.rows;
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
router.patch('/complaints/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const complaintId = req.params.id;
  const { status, admin_response } = req.body;

  if (!status && admin_response === undefined) { // Check for undefined to allow empty string
    return res.status(400).json({ success: false, message: 'At least one of status or admin_response is required.' });
  }

  const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  let query = 'UPDATE complaints SET updated_at = CURRENT_TIMESTAMP';
  const params = [];
  let paramIndex = 1;

  if (status) {
    query += `, status = $${paramIndex++}`;
    params.push(status);
  }
  if (admin_response !== undefined) {
    query += `, admin_response = $${paramIndex++}`;
    params.push(admin_response);
  }

  query += ` WHERE id = $${paramIndex++} RETURNING *`;
  params.push(complaintId);

  try {
    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found or no changes made.' });
    }

    const updatedComplaint = result.rows[0];

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
router.get('/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const totalResult = await pool.query('SELECT COUNT(*) AS count FROM complaints');
    const total = parseInt(totalResult.rows[0].count, 10);

    const pendingResult = await pool.query("SELECT COUNT(*) AS count FROM complaints WHERE status = 'Pending'");
    const pending = parseInt(pendingResult.rows[0].count, 10);

    const inProgressResult = await pool.query("SELECT COUNT(*) AS count FROM complaints WHERE status = 'In Progress'");
    const inProgress = parseInt(inProgressResult.rows[0].count, 10);

    const resolvedResult = await pool.query("SELECT COUNT(*) AS count FROM complaints WHERE status = 'Resolved'");
    const resolved = parseInt(resolvedResult.rows[0].count, 10);

    const rejectedResult = await pool.query("SELECT COUNT(*) AS count FROM complaints WHERE status = 'Rejected'");
    const rejected = parseInt(rejectedResult.rows[0].count, 10);

    const byCategoryRawResult = await pool.query('SELECT category, COUNT(*) AS count FROM complaints GROUP BY category');
    const byCategory = byCategoryRawResult.rows.reduce((acc, item) => {
      acc[item.category] = parseInt(item.count, 10);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Complaint statistics retrieved successfully.',
      data: {
        totalComplaints: total, // Renamed to match frontend
        pendingComplaints: pending, // Renamed to match frontend
        inProgressComplaints: inProgress, // Renamed to match frontend
        resolvedComplaints: resolved, // Renamed to match frontend
        rejectedComplaints: rejected, // Renamed to match frontend
        complaintsByCategory: byCategory, // Renamed to match frontend
      },
    });
  } catch (error) {
    console.error('Error fetching complaint statistics:', error);
    res.status(500).json({ success: false, message: 'Server error fetching statistics.' });
  }
});

// GET /api/admin/reports
router.get('/reports', authenticateToken, authorizeAdmin, async (req, res) => {
  const { from: from_date, to: to_date } = req.query; // Use 'from' and 'to' as per frontend

  let query = `
    SELECT
      c.id, c.title, c.category, c.description, c.priority, c.status, c.admin_response, c.created_at, c.updated_at,
      u.full_name AS user_full_name, u.room_number AS user_room_number, u.matric_number AS user_matric_number, u.email AS user_email
    FROM complaints c
    JOIN users u ON c.user_id = u.id
  `;
  const params = [];
  const conditions = [];
  let paramIndex = 1;

  if (from_date) {
    conditions.push(`c.created_at >= $${paramIndex++}`);
    params.push(from_date);
  }
  if (to_date) {
    conditions.push(`c.created_at <= $${paramIndex++}`);
    params.push(to_date);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY c.created_at DESC';

  try {
    const reportsResult = await pool.query(query, params);
    const reports = reportsResult.rows;

    // Calculate summary statistics for the report
    const summary = {
      total: reports.length,
      pending: reports.filter(c => c.status === 'Pending').length,
      inProgress: reports.filter(c => c.status === 'In Progress').length,
      resolved: reports.filter(c => c.status === 'Resolved').length,
      rejected: reports.filter(c => c.status === 'Rejected').length,
    };

    res.status(200).json({
      success: true,
      message: 'Complaint reports retrieved successfully.',
      data: {
        complaints: reports,
        summary: summary,
      },
    });
  } catch (error) {
    console.error('Error fetching complaint reports:', error);
    res.status(500).json({ success: false, message: 'Server error fetching reports.' });
  }
});

module.exports = router;

module.exports = router;