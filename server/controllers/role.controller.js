const pool = require("../config/database");
const ResponseHandler = require("../utils/response");

class RoleController {
  async createRole(req, res) {
    const connection = await pool.getConnection();
    try {
      const { name, description } = req.body;

      // Check if role exists
      const [existingRoles] = await connection.execute(
        "SELECT id FROM roles WHERE name = ?",
        [name]
      );

      if (existingRoles.length > 0) {
        return ResponseHandler.error(res, "Role already exists", 400);
      }

      // Create role
      const [result] = await connection.execute(
        "INSERT INTO roles (name, description) VALUES (?, ?)",
        [name, description]
      );

      ResponseHandler.success(
        res,
        { roleId: result.insertId },
        "Role created successfully",
        201
      );
    } catch (error) {
      console.error("Create role error:", error);
      ResponseHandler.error(res, "Failed to create role");
    } finally {
      connection.release();
    }
  }

  async getRoles(req, res) {
    const connection = await pool.getConnection();
    try {
      const [roles] = await connection.execute(
        "SELECT * FROM roles ORDER BY name"
      );

      ResponseHandler.success(res, roles);
    } catch (error) {
      console.error("Get roles error:", error);
      ResponseHandler.error(res, "Failed to fetch roles");
    } finally {
      connection.release();
    }
  }

  async getRoleDetails(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;

      // Get role details
      const [roles] = await connection.execute(
        "SELECT * FROM roles WHERE id = ?",
        [id]
      );

      if (roles.length === 0) {
        return ResponseHandler.error(res, "Role not found", 404);
      }

      // Get permissions
      const [permissions] = await connection.execute(
        `SELECT p.* 
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = ?`,
        [id]
      );

      ResponseHandler.success(res, {
        ...roles[0],
        permissions,
      });
    } catch (error) {
      console.error("Get role details error:", error);
      ResponseHandler.error(res, "Failed to fetch role details");
    } finally {
      connection.release();
    }
  }

  async updateRole(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Update role
      await connection.execute(
        "UPDATE roles SET name = ?, description = ? WHERE id = ?",
        [name, description, id]
      );

      ResponseHandler.success(res, null, "Role updated successfully");
    } catch (error) {
      console.error("Update role error:", error);
      ResponseHandler.error(res, "Failed to update role");
    } finally {
      connection.release();
    }
  }

  async createPermission(req, res) {
    const connection = await pool.getConnection();
    try {
      const { name, description } = req.body;

      // Check if permission exists
      const [existingPermissions] = await connection.execute(
        "SELECT id FROM permissions WHERE name = ?",
        [name]
      );

      if (existingPermissions.length > 0) {
        return ResponseHandler.error(res, "Permission already exists", 400);
      }

      // Create permission
      const [result] = await connection.execute(
        "INSERT INTO permissions (name, description) VALUES (?, ?)",
        [name, description]
      );

      ResponseHandler.success(
        res,
        { permissionId: result.insertId },
        "Permission created successfully",
        201
      );
    } catch (error) {
      console.error("Create permission error:", error);
      ResponseHandler.error(res, "Failed to create permission");
    } finally {
      connection.release();
    }
  }

  async getPermissions(req, res) {
    const connection = await pool.getConnection();
    try {
      const [permissions] = await connection.execute(
        "SELECT * FROM permissions ORDER BY name"
      );

      ResponseHandler.success(res, permissions);
    } catch (error) {
      console.error("Get permissions error:", error);
      ResponseHandler.error(res, "Failed to fetch permissions");
    } finally {
      connection.release();
    }
  }

  async assignPermission(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { permissionId } = req.body;

      // Check if role and permission exist
      const [roles] = await connection.execute(
        "SELECT id FROM roles WHERE id = ?",
        [id]
      );

      if (roles.length === 0) {
        return ResponseHandler.error(res, "Role not found", 404);
      }

      const [permissions] = await connection.execute(
        "SELECT id FROM permissions WHERE id = ?",
        [permissionId]
      );

      if (permissions.length === 0) {
        return ResponseHandler.error(res, "Permission not found", 404);
      }

      // Check if already assigned
      const [assignments] = await connection.execute(
        "SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?",
        [id, permissionId]
      );

      if (assignments.length > 0) {
        return ResponseHandler.error(res, "Permission already assigned", 400);
      }

      // Assign permission
      await connection.execute(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [id, permissionId]
      );

      ResponseHandler.success(res, null, "Permission assigned successfully");
    } catch (error) {
      console.error("Assign permission error:", error);
      ResponseHandler.error(res, "Failed to assign permission");
    } finally {
      connection.release();
    }
  }

  async removePermission(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id, permissionId } = req.params;

      // Remove permission
      await connection.execute(
        "DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?",
        [id, permissionId]
      );

      ResponseHandler.success(res, null, "Permission removed successfully");
    } catch (error) {
      console.error("Remove permission error:", error);
      ResponseHandler.error(res, "Failed to remove permission");
    } finally {
      connection.release();
    }
  }
}

module.exports = new RoleController();
