const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Template management
router.post("/templates", notificationController.createTemplate);
router.get("/templates", notificationController.getTemplates);
router.put("/templates/:id", notificationController.updateTemplate);

// Notification sending
router.post("/send", notificationController.sendNotification);
router.post("/bulk-send", notificationController.sendBulkNotification);

// Notification history
router.get("/history", notificationController.getNotificationHistory);
router.get("/history/:userId", notificationController.getUserNotifications);
router.get("/dashboard", notificationController.getDashboard);

module.exports = router;
