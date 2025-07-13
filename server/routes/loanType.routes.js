// routes/loanType.routes.js
const express = require("express");
const router = express.Router();
const loanController = require("../controllers/loan.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/list", loanController.listLoanTypes);

module.exports = router;
