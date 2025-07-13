const express = require("express");
const router = express.Router();
const roleController = require("../controllers/role.controller");
const authMiddleware = require("../middleware/auth");
const { hasRole } = require("../middleware/permission");

router.use(authMiddleware);
router.use(hasRole("admin"));

// Role management
router.post("/", roleController.createRole);
router.get("/", roleController.getRoles);
router.get("/:id", roleController.getRoleDetails);
router.put("/:id", roleController.updateRole);

// Permission management
router.post("/permissions", roleController.createPermission);
router.get("/permissions", roleController.getPermissions);
router.post("/:id/permissions", roleController.assignPermission);
router.delete(
  "/:id/permissions/:permissionId",
  roleController.removePermission
);

module.exports = router;
