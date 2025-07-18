const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token required" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name FROM periods ORDER BY id ASC"
    );
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: "Error fetching periods" });
  }
});

module.exports = router;
