const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// 1. Search members by name (autocomplete)
router.get("/search", async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: "Name required" });
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name FROM members WHERE first_name LIKE ? OR last_name LIKE ? LIMIT 10`,
    [`%${name}%`, `%${name}%`]
  );
  res.json({ members: rows });
});

// 2. Get member email by ID
router.get("/:id/email", async (req, res) => {
  const memberId = req.params.id;
  const [[member]] = await pool.query(
    `SELECT email FROM members WHERE id = ?`,
    [memberId]
  );
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json({ email: member.email });
});

// 3. Send OTP to email
router.post("/:id/send-otp", async (req, res) => {
  const memberId = req.params.id;
  const [[member]] = await pool.query(
    `SELECT email FROM members WHERE id = ?`,
    [memberId]
  );

  // Accept email from request body if not in DB
  let email = member && member.email ? member.email : null;
  if (!email && req.body && req.body.email) {
    email = req.body.email;
    console.log(`This is email sent: ${email}`);
    // Optionally update the DB with this email:
    // await pool.query(`UPDATE members SET email = ? WHERE id = ?`, [email, memberId]);
  }

  if (!email) return res.status(404).json({ error: "Email not found" });

  // Generate OTP
  const otp = ("" + Math.floor(100000 + Math.random() * 900000)).substring(
    0,
    6
  );
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

  // Save OTP
  await pool.query(
    `INSERT INTO password_resets (member_id, otp, expires_at) VALUES (?, ?, ?)`,
    [memberId, otp, expiresAt]
  );

  const transporter = nodemailer.createTransport({
    host: "mail.ifeloduncms.com.ng",
    port: 465,
    secure: true, // true for port 465 (SSL)
    auth: {
      user: "no-reply@ifeloduncms.com.ng",
      pass: "JA3Y9rW_VPtoV}]M", // or your actual password, but env is safer
    },
  });

  // HTML email template with inline CSS
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color: #2c3e50; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Ifelodun Cooperative</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; text-align: center;">
            <h2 style="color: #2c3e50; font-size: 20px; margin: 0 0 20px;">Your One-Time Password (OTP)</h2>
            <p style="color: #333333; font-size: 16px; margin: 0 0 20px;">Use the following OTP to complete your email update process. This code expires in 10 minutes.</p>
            <div style="background-color: #e8f0fe; padding: 15px; border-radius: 6px; display: inline-block;">
              <span style="font-size: 24px; font-weight: bold; color: #1a73e8; letter-spacing: 2px;">${otp}</span>
            </div>
            <p style="color: #666666; font-size: 14px; margin: 20px 0 0;">For security, do not share this OTP with anyone.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f4f4f4; padding: 20px; text-align: center; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
            <p style="color: #666666; font-size: 12px; margin: 0;">&copy; 2025 Ifelodun Cooperative. All rights reserved.</p>
            <p style="color: #666666; font-size: 12px; margin: 5px 0 0;">
              <a href="https://ifeloduncms.com.ng" style="color: #1a73e8; text-decoration: none;">Visit our website</a> | 
              <a href="mailto:support@ifeloduncms.com.ng" style="color: #1a73e8; text-decoration: none;">Contact Support</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: '"Ifelodun Coop" <no-reply@ifeloduncms.com.ng>',
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });
    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Failed to send OTP", details: err.message });
  }
});

// 4. Verify OTP
router.post("/:id/verify-otp", async (req, res) => {
  const memberId = req.params.id;
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: "OTP required" });

  const [[row]] = await pool.query(
    `SELECT * FROM password_resets WHERE member_id = ? AND otp = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
    [memberId, otp]
  );
  if (!row) return res.status(400).json({ error: "Invalid or expired OTP" });

  res.json({ message: "OTP valid" });
});

// 5. Reset password
const bcrypt = require("bcryptjs");
router.post("/:id/reset-password", async (req, res) => {
  const memberId = req.params.id;
  const { otp, password } = req.body;
  if (!otp || !password)
    return res.status(400).json({ error: "OTP and password required" });

  // Check OTP
  const [[row]] = await pool.query(
    `SELECT * FROM password_resets WHERE member_id = ? AND otp = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
    [memberId, otp]
  );
  if (!row) return res.status(400).json({ error: "Invalid or expired OTP" });

  // Get user_id from members table
  const [[member]] = await pool.query(
    `SELECT user_id FROM members WHERE id = ?`,
    [memberId]
  );
  if (!member || !member.user_id)
    return res.status(404).json({ error: "User not found" });

  // Hash new password
  const hashed = await bcrypt.hash(password, 10);

  // Update password in users table
  await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [
    hashed,
    member.user_id,
  ]);

  // Mark OTP as used
  await pool.query(`UPDATE password_resets SET used = 1 WHERE id = ?`, [
    row.id,
  ]);

  res.json({ message: "Password reset successful" });
});

router.post("/:id/update-email", async (req, res) => {
  const memberId = req.params.id;
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "email required" });

  // Optional: Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    // Get user_id from members table
    const [[member]] = await pool.query(
      `SELECT user_id FROM members WHERE id = ?`,
      [memberId]
    );
    if (!member || !member.user_id)
      return res.status(404).json({ error: "User not found" });

    // Check if email is already in use in users table
    const [[existingUser]] = await pool.query(
      `SELECT id FROM users WHERE email = ? AND id != ?`,
      [email, member.user_id]
    );
    if (existingUser)
      return res.status(400).json({ error: "Email already in use" });

    // Update email in users table
    await pool.query(`UPDATE users SET email = ? WHERE id = ?`, [
      email,
      member.user_id,
    ]);

    // Update email in members table
    await pool.query(`UPDATE members SET email = ? WHERE user_id = ?`, [
      email,
      memberId,
    ]);

    res.json({ message: "Email updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
