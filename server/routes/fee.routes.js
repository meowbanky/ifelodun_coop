// routes/fee.routes.js
const express = require("express");
const router = express.Router();
const feeController = require("../controllers/fee.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/config", feeController.getFeeConfigs);
router.post("/config", feeController.addFeeConfig);
router.put("/config/:id", feeController.updateFeeConfig);

module.exports = router;
