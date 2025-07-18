// change_password.js (Express Router)
const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const bcrypt = require("bcryptjs");

// Change password
router.post("/", async (req, res) => {
  const { user_id, old_password, new_password } = req.body;
  if (!user_id || !old_password || !new_password)
    return res.status(400).json({ error: "Missing fields" });

  // Get current hash
  const [[user]] = await pool.query("SELECT password FROM users WHERE id = ?", [
    user_id,
  ]);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Check old password
  const match = await bcrypt.compare(old_password, user.password);
  if (!match) return res.status(400).json({ error: "Old password incorrect" });

  // Hash and update
  const hash = await bcrypt.hash(new_password, 10);
  await pool.query("UPDATE users SET password = ? WHERE id = ?", [
    hash,
    user_id,
  ]);
  res.json({ message: "Password changed successfully" });
});

module.exports = router;
