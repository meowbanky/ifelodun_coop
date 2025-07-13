const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const authMiddleware = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get comprehensive analytics data
router.get("/", analyticsController.getAnalytics);

// Get dashboard summary
router.get("/dashboard-summary", analyticsController.getDashboardSummary);

// Get financial trends
router.get("/financial-trends", analyticsController.getFinancialTrends);

module.exports = router; 