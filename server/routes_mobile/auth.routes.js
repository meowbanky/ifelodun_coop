const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

router.post(
  "/login",
  [
    body("identifier").notEmpty().withMessage("Identifier is required"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { identifier, password } = req.body;

    try {
      const connection = await pool.getConnection();
      const [users] = await connection.execute(
        "SELECT * FROM users INNER JOIN members ON users.id = members.user_id WHERE (users.username = ? OR users.email = ? OR members.phone_number = ?) AND is_active = 1",
        [identifier, identifier, identifier]
      );

      console.error("Users found:", identifier);
      if (users.length === 0) {
        connection.release();
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = users[0];
      console.error("User authenticated:", user.id);
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        connection.release();
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Fetch member details
      const [members] = await connection.execute(
        "SELECT member_id, id,first_name, last_name FROM members WHERE user_id = ? LIMIT 1",
        [user.id]
      );
      connection.release();

      if (members.length === 0) {
        return res.status(404).json({ error: "Member record not found" });
      }

      const member = members[0];

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({
        token,
        role: user.role,
        name: `${member.first_name} ${member.last_name}`,
        member_id: member.id,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
