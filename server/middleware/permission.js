const pool = require("../config/database");
const ResponseHandler = require("../utils/response");

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.error(res, "Not authenticated", 401);
    }

    const connection = await pool.getConnection();
    try {
      // Get user permissions through roles
      const [permissions] = await connection.execute(
        `SELECT DISTINCT p.name
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = ?`,
        [req.user.id]
      );

      const userPermissions = permissions.map((p) => p.name);

      if (userPermissions.includes(requiredPermission)) {
        next();
      } else {
        ResponseHandler.error(res, "Permission denied", 403);
      }
    } catch (error) {
      console.error("Permission check error:", error);
      ResponseHandler.error(res, "Failed to check permissions", 500);
    } finally {
      connection.release();
    }
  };
};

const hasRole = (requiredRole) => {
  return async (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.error(res, "Not authenticated", 401);
    }

    const connection = await pool.getConnection();
    try {
      // Get user roles
      const [roles] = await connection.execute(
        `SELECT r.name
                FROM roles r
                JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = ?`,
        [req.user.id]
      );

      const userRoles = roles.map((r) => r.name);

      if (userRoles.includes(requiredRole)) {
        next();
      } else {
        ResponseHandler.error(res, "Role required", 403);
      }
    } catch (error) {
      console.error("Role check error:", error);
      ResponseHandler.error(res, "Failed to check roles", 500);
    } finally {
      connection.release();
    }
  };
};

module.exports = {
  checkPermission,
  hasRole,
};
