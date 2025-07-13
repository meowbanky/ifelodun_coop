// routes/commodity.routes.js
const express = require("express");
const router = express.Router();
const commodityController = require("../controllers/commodity.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.post("/bulk", commodityController.recordBulkCommodities);
router.get("/period/:periodId", commodityController.getCommoditiesByPeriod);
router.delete("/:id", commodityController.deleteCommodity); // New DELETE route

module.exports = router;
