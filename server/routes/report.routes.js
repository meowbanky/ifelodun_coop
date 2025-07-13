const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller"); // Use reportController for all report-related routes
const periodController = require("../controllers/period.controller"); // Only use if period-specific routes are needed
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Only include implemented methods
router.get("/financial/summary", reportController.getFinancialSummary);
router.get("/monthly", reportController.getMonthlyReport);
router.post("/generate", reportController.generateReports); // Corrected from generateReport to generateReports
router.post("/", periodController.generateReports); // Keep this if it's intentional for period-specific reports

module.exports = router;
