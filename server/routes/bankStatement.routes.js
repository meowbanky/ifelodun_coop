const express = require("express");
const router = express.Router();
const bankStatementController = require("../controllers/bankStatement.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Upload bank statement files
router.post("/upload", bankStatementController.uploadBankStatement);

// Extract data from uploaded files
router.post("/extract", bankStatementController.extractData);

// Match extracted names with members
router.post("/match-names", bankStatementController.matchNames);

// Process matched transactions
router.post("/process", bankStatementController.processTransactions);

// Get extracted transactions for review
router.get("/transactions", bankStatementController.getExtractedTransactions);

// Get unmatched transactions for export
router.get("/unmatched", bankStatementController.getUnmatchedTransactions);

// Get processing statistics
router.get("/stats", bankStatementController.getProcessingStats);

// Edit transaction
router.put(
  "/transactions/:transactionId",
  bankStatementController.editTransaction
);

// Delete transaction
router.delete(
  "/transactions/:transactionId",
  bankStatementController.deleteTransaction
);

module.exports = router;
