const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware for JWT auth
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

// Get profile + next of kin
router.get("/:id", authenticateToken, async (req, res) => {
  const memberId = parseInt(req.params.id, 10);
  const connection = await pool.getConnection();
  try {
    // Get member info with email from users table
    const [memberRows] = await connection.query(
      `SELECT m.id, m.member_id, m.first_name, m.last_name, m.middle_name, 
              m.phone_number, u.email, m.address, m.date_of_birth, m.gender, 
              m.employment_status 
       FROM members m 
       INNER JOIN users u ON m.user_id = u.id 
       WHERE m.id = ?`,
      [memberId]
    );
    if (memberRows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }
    const member = memberRows[0];

    // Get next of kin
    const [nokRows] = await connection.query(
      "SELECT id, first_name, last_name, relationship, phone_number, address FROM next_of_kin WHERE member_id = ?",
      [memberId]
    );
    // You can support multiple next of kin if you want
    const nextOfKin = nokRows.length ? nokRows[0] : null;

    res.json({
      ...member,
      next_of_kin: nextOfKin,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching profile" });
  } finally {
    connection.release();
  }
});

// Update profile + next of kin
router.put("/:id", authenticateToken, async (req, res) => {
  const memberId = parseInt(req.params.id, 10);
  const connection = await pool.getConnection();
  try {
    const {
      first_name,
      last_name,
      middle_name,
      phone_number,
      email,
      address,
      date_of_birth,
      gender,
      employment_status,
      next_of_kin,
    } = req.body;

    // Update member
    const updates = [];
    const values = [];
    if (first_name !== undefined) {
      updates.push("first_name=?");
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push("last_name=?");
      values.push(last_name);
    }
    if (middle_name !== undefined) {
      updates.push("middle_name=?");
      values.push(middle_name);
    }
    if (phone_number !== undefined) {
      updates.push("phone_number=?");
      values.push(phone_number);
    }
    // Note: Email is now stored in users table only
    // We'll handle email update separately if needed
    // (Email updates should go through the users table via user_id)
    if (address !== undefined) {
      updates.push("address=?");
      values.push(address);
    }
    if (date_of_birth !== undefined) {
      updates.push("date_of_birth=?");
      values.push(date_of_birth);
    }
    if (gender !== undefined) {
      updates.push("gender=?");
      values.push(gender);
    }
    if (employment_status !== undefined) {
      updates.push("employment_status=?");
      values.push(employment_status);
    }

    if (updates.length > 0) {
      await connection.query(
        `UPDATE members SET ${updates.join(", ")} WHERE id = ?`,
        [...values, memberId]
      );
    }

    // Handle email update separately (email is in users table)
    if (email !== undefined) {
      // Get user_id from member
      const [[member]] = await connection.query(
        "SELECT user_id FROM members WHERE id = ?",
        [memberId]
      );
      if (member && member.user_id) {
        // Check for duplicate email
        const [[existing]] = await connection.query(
          "SELECT id FROM users WHERE email = ? AND id != ?",
          [email, member.user_id]
        );
        if (!existing) {
          await connection.query(
            "UPDATE users SET email = ? WHERE id = ?",
            [email, member.user_id]
          );
        }
      }
    }

    // Update/insert next_of_kin
    if (next_of_kin && typeof next_of_kin === "object") {
      const nok = next_of_kin;
      const [nokExists] = await connection.query(
        "SELECT id FROM next_of_kin WHERE member_id = ?",
        [memberId]
      );
      if (nokExists.length > 0) {
        // update
        await connection.query(
          "UPDATE next_of_kin SET first_name=?, last_name=?, relationship=?, phone_number=?, address=? WHERE member_id=?",
          [
            nok.first_name || "",
            nok.last_name || "",
            nok.relationship || "",
            nok.phone_number || "",
            nok.address || "",
            memberId,
          ]
        );
      } else {
        // insert
        await connection.query(
          "INSERT INTO next_of_kin (member_id, first_name, last_name, relationship, phone_number, address) VALUES (?, ?, ?, ?, ?, ?)",
          [
            memberId,
            nok.first_name || "",
            nok.last_name || "",
            nok.relationship || "",
            nok.phone_number || "",
            nok.address || "",
          ]
        );
      }
    }

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating profile" });
  } finally {
    connection.release();
  }
});

module.exports = router;
