const pool = require("../config/database");
const ResponseHandler = require("../utils/response");
const bcrypt = require("bcryptjs");

class UserController {
  async listUsers(req, res) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.execute(
        `SELECT 
                    u.id, u.username, u.email, u.role, 
                    u.is_active, u.created_at
                FROM users u
                ORDER BY u.created_at DESC`
      );

      ResponseHandler.success(res, users);
    } catch (error) {
      console.error("List users error:", error);
      ResponseHandler.error(res, "Failed to fetch users");
    } finally {
      connection.release();
    }
  }

  async getUserDetails(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;

      // Check if requesting own details or admin
      if (req.user.id !== parseInt(id) && req.user.role !== "admin") {
        return ResponseHandler.error(res, "Permission denied", 403);
      }

      // Get user details
      const [users] = await connection.execute(
        `SELECT 
                    u.id, u.username, u.email, u.role, 
                    u.is_active, u.created_at
                FROM users u
                WHERE u.id = ?`,
        [id]
      );

      if (users.length === 0) {
        return ResponseHandler.error(res, "User not found", 404);
      }

      // Get user roles
      const [roles] = await connection.execute(
        `SELECT r.id, r.name, r.description
                FROM roles r
                JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = ?`,
        [id]
      );

      ResponseHandler.success(res, {
        ...users[0],
        roles,
      });
    } catch (error) {
      console.error("Get user details error:", error);
      ResponseHandler.error(res, "Failed to fetch user details");
    } finally {
      connection.release();
    }
  }

  async updateUser(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { email, role } = req.body;

      // Update user
      await connection.execute(
        `UPDATE users 
                SET email = ?, role = ?
                WHERE id = ?`,
        [email, role, id]
      );

      ResponseHandler.success(res, null, "User updated successfully");
    } catch (error) {
      console.error("Update user error:", error);
      ResponseHandler.error(res, "Failed to update user");
    } finally {
      connection.release();
    }
  }

  async updateUserStatus(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // Update user status
      await connection.execute(
        `UPDATE users 
                SET is_active = ?
                WHERE id = ?`,
        [isActive, id]
      );

      ResponseHandler.success(
        res,
        null,
        `User ${isActive ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      console.error("Update user status error:", error);
      ResponseHandler.error(res, "Failed to update user status");
    } finally {
      connection.release();
    }
  }

  async assignRole(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      // Check if role exists
      const [roles] = await connection.execute(
        "SELECT id FROM roles WHERE id = ?",
        [roleId]
      );

      if (roles.length === 0) {
        return ResponseHandler.error(res, "Role not found", 404);
      }

      // Check if already assigned
      const [assignments] = await connection.execute(
        "SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?",
        [id, roleId]
      );

      if (assignments.length > 0) {
        return ResponseHandler.error(res, "Role already assigned", 400);
      }

      // Assign role
      await connection.execute(
        "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
        [id, roleId]
      );

      ResponseHandler.success(res, null, "Role assigned successfully");
    } catch (error) {
      console.error("Assign role error:", error);
      ResponseHandler.error(res, "Failed to assign role");
    } finally {
      connection.release();
    }
  }

  async removeRole(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id, roleId } = req.params;

      // Remove role
      await connection.execute(
        "DELETE FROM user_roles WHERE user_id = ? AND role_id = ?",
        [id, roleId]
      );

      ResponseHandler.success(res, null, "Role removed successfully");
    } catch (error) {
      console.error("Remove role error:", error);
      ResponseHandler.error(res, "Failed to remove role");
    } finally {
      connection.release();
    }
  }
}

module.exports = new UserController();
