const express = require("express");
const router = express.Router();
const periodController = require("../controllers/period.controller");
const authMiddleware = require("../middleware/auth");

// All routes require authentication
router.use(authMiddleware);

// Period management routes
router.post("/create", periodController.createPeriod);
router.get("/list", periodController.listPeriods);
router.post("/:periodId/process", periodController.processPeriod); // Process for a specific period
router.post("/process", periodController.processPeriod); // Process for all (if intended)
router.put("/:periodId/update", periodController.updatePeriod);
router.get(
  "/contribution-sum-from-contributions/:periodId", // Removed leading /periods
  periodController.getContributionSum
);
router.post(
  "/update-threshold",
  periodController.updateLoanActivationThreshold
);
router.get(
  "/threshold",
  periodController.getLoanActivationThreshold
);

module.exports = router;
