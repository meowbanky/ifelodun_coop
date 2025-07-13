const express = require("express");
const router = express.Router();
const coopTransactionController = require("../controllers/coop_transaction.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.post("/", coopTransactionController.addTransaction);
router.get("/", coopTransactionController.listTransactions);
router.delete("/:id", coopTransactionController.deleteTransaction);
router.put("/:id", coopTransactionController.updateTransaction);

module.exports = router;
