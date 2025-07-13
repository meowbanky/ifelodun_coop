const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ResponseHandler = require("../utils/response");

class AuthController {
  async register(req, res) {
    const connection = await pool.getConnection();
    try {
      const { username, password, email, role = "member" } = req.body;

      // Check if user exists
      const [existingUsers] = await connection.execute(
        "SELECT id FROM users WHERE username = ? OR email = ?",
        [username, email]
      );

      if (existingUsers.length > 0) {
        return ResponseHandler.error(
          res,
          "Username or email already exists",
          400
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [result] = await connection.execute(
        "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
        [username, hashedPassword, email, role]
      );

      ResponseHandler.success(
        res,
        { userId: result.insertId },
        "User registered successfully",
        201
      );
    } catch (error) {
      console.error("Registration error:", error);
      ResponseHandler.error(res, "Failed to register user");
    } finally {
      connection.release();
    }
  }

  async login(req, res) {
    const connection = await pool.getConnection();
    try {
      const { username, password } = req.body;

      // Get user
      const [users] = await connection.execute(
        "SELECT * FROM users WHERE username = ?",
        [username]
      );

      if (users.length === 0) {
        return ResponseHandler.error(res, "Invalid credentials", 401);
      }

      const user = users[0];

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return ResponseHandler.error(res, "Invalid credentials", 401);
      }

      // Generate token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      ResponseHandler.success(res, { token });
    } catch (error) {
      console.error("Login error:", error);
      ResponseHandler.error(res, "Failed to login");
    } finally {
      connection.release();
    }
  }

  async getProfile(req, res) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.execute(
        "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
        [req.user.id]
      );

      if (users.length === 0) {
        return ResponseHandler.error(res, "User not found", 404);
      }

      ResponseHandler.success(res, users[0]);
    } catch (error) {
      console.error("Get profile error:", error);
      ResponseHandler.error(res, "Failed to get profile");
    } finally {
      connection.release();
    }
  }

  async changePassword(req, res) {
    const connection = await pool.getConnection();
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user
      const [users] = await connection.execute(
        "SELECT * FROM users WHERE id = ?",
        [req.user.id]
      );

      if (users.length === 0) {
        return ResponseHandler.error(res, "User not found", 404);
      }

      // Verify current password
      const validPassword = await bcrypt.compare(
        currentPassword,
        users[0].password
      );

      if (!validPassword) {
        return ResponseHandler.error(res, "Current password is incorrect", 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await connection.execute("UPDATE users SET password = ? WHERE id = ?", [
        hashedPassword,
        req.user.id,
      ]);

      ResponseHandler.success(res, null, "Password updated successfully");
    } catch (error) {
      console.error("Change password error:", error);
      ResponseHandler.error(res, "Failed to change password");
    } finally {
      connection.release();
    }
  }
}

module.exports = new AuthController();
