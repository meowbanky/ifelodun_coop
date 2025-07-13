const express = require("express");
const router = express.Router();
const contributionController = require("../controllers/contribution.controller");
const authMiddleware = require("../middleware/auth");
const ValidationMiddleware = require("../middleware/validation");

router.use(authMiddleware);

// Contribution routes
router.post(
  "/record",
  ValidationMiddleware.validateContribution,
  contributionController.recordContribution
);
router.post(
  "/bulk",
  ValidationMiddleware.validateContribution,
  contributionController.recordBulkContributions
);

router.post("/record", contributionController.recordContribution); // Removed validation for simplicity
router.post("/bulk", contributionController.recordBulkContributions);
router.get("/member/:memberId", contributionController.getMemberContributions);
router.get("/period/:periodId", contributionController.getPeriodContributions);
router.get("/settings", contributionController.getSettings); // Added
router.put("/settings", contributionController.updateSettings); // Added
router.get(
  "/period/:periodId",
  contributionController.getContributionsByPeriod
);
router.delete("/:id", contributionController.deleteContribution);
module.exports = router;
