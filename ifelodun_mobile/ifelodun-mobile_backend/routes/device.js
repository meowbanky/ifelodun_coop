const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// Update device ID for user
router.post("/update-device", async (req, res) => {
  const { user_id, device_id } = req.body;
  if (!user_id || !device_id)
    return res.status(400).json({ error: "Missing fields" });

  // Get current device_id
  const [[user]] = await pool.query(
    "SELECT device_id FROM users WHERE id = ?",
    [user_id]
  );
  if (!user) return res.status(404).json({ error: "User not found" });

  // If device_id is different or not set, update it
  if (!user.device_id || user.device_id !== device_id) {
    await pool.query("UPDATE users SET device_id = ? WHERE id = ?", [
      device_id,
      user_id,
    ]);
    return res.json({ message: "Device ID updated" });
  }

  res.json({ message: "Device ID already up to date" });
});

module.exports = router;
