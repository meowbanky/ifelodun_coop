const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth");

// Public routes (NO auth middleware)
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected routes (apply middleware individually)
router.get("/profile", authMiddleware, authController.getProfile);
router.post("/change-password", authMiddleware, authController.changePassword);

module.exports = router;
