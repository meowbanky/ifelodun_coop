// routes/member.routes.js
const express = require("express");
const router = express.Router();
const memberController = require("../controllers/member.controller");
const loanController = require("../controllers/loan.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Specific routes first
router.get("/list", memberController.listMembers);
router.get("/search", memberController.searchMembers);
router.get("/with-stop-interest", memberController.listMembersWithStopInterest);
router.get("/bank-sortcodes", (req, res, next) => {
  console.log("Bank sortcodes route hit at /api/members/bank-sortcodes");
  memberController.listBankSortCodes(req, res, next);
});

// Parameterized routes after specific routes
router.get("/:id", memberController.getMemberDetails);
router.post("/register", memberController.registerMember);
router.put("/:id", memberController.updateMember);
router.get("/:memberId/loans", loanController.getMemberLoans);
router.get("/:memberId/balances", loanController.getMemberBalances);
router.get(
  "/:memberId/cumulative-balances",
  loanController.getMemberCumulativeBalances
);
router.get("/:memberId/bank-details", memberController.getMemberBankDetails);
router.post(
  "/:memberId/bank-details",
  memberController.upsertMemberBankDetails
);
router.put(
  "/:memberId/settings",
  authMiddleware,
  memberController.updateMemberSettings
);
router.get(
  "/:memberId/settings",
  authMiddleware,
  memberController.getMemberSettings
);
router.post(
  "/:memberId/withdraw",
  authMiddleware,
  memberController.withdrawFromBalance
);
router.get(
  "/:memberId/financial-data/:periodId",
  memberController.getMemberFinancialData
);
router.put(
  "/:memberId/financial-data/:periodId",
  memberController.updateMemberFinancialData
);
module.exports = router;
