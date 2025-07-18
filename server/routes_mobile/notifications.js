const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get notifications for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY date DESC',
    [userId]
  );
  res.json(rows);
});

// Mark notification as read
router.post('/:id/read', async (req, res) => {
  const { id } = req.params;
  await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  res.json({ message: 'Notification marked as read' });
});

// Create a notification (for testing/admin)
router.post('/', async (req, res) => {
  const { user_id, title, body } = req.body;
  await pool.query(
    'INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)',
    [user_id, title, body]
  );
  res.json({ message: 'Notification created' });
});

module.exports = router;