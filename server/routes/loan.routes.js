// routes/loan.routes.js
const express = require("express");
const router = express.Router();
const loanController = require("../controllers/loan.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.post("/grant", loanController.grantLoan);
router.get("/members/:memberId/loans", loanController.getMemberLoans);
router.get("/members/:memberId/balances", loanController.getMemberBalances);
router.get("/loan-types/list", loanController.listLoanTypes);
router.get("/period/:periodId/pending", loanController.getPendingLoansByPeriod); // Added
router.delete("/:id", loanController.deleteLoan); // Added
router.get("/period/:periodId/total", loanController.getTotalLoansByPeriod);
router.get("/loans/:loanid", loanController.editLoan);
router.put("/:id", loanController.editLoan);

module.exports = router;
