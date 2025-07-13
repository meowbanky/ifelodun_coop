const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const authMiddleware = require("../middleware/auth");
const { hasRole } = require("../middleware/permission");

// Public routes
router.get("/public", settingsController.getPublicSettings);

// Protected routes
router.use(authMiddleware);

// Admin-only routes
router.use(hasRole("admin"));
router.get("/", settingsController.getAllSettings);
router.get("/category/:category", settingsController.getCategory);
router.put("/:category/:name", settingsController.updateSetting);
router.delete("/:category/:name", settingsController.deleteSetting);
router.post("/initialize", settingsController.initializeDefaultSettings);

module.exports = router;
