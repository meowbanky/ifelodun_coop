const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth");
const { hasRole } = require("../middleware/permission");

router.use(authMiddleware);

// User management (admin only)
router.get("/", hasRole("admin"), userController.listUsers);
router.get("/:id", userController.getUserDetails);
router.put("/:id", hasRole("admin"), userController.updateUser);
router.put("/:id/status", hasRole("admin"), userController.updateUserStatus);
router.post("/:id/roles", hasRole("admin"), userController.assignRole);
router.delete(
  "/:id/roles/:roleId",
  hasRole("admin"),
  userController.removeRole
);

module.exports = router;
