const express = require("express");
const router = express.Router();
const guarantorController = require("../controllers/guarantor.controller");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/settings", (req, res, next) => {
  console.log("GET /api/guarantors/settings requested");
  guarantorController.getSettings(req, res, next);
});
router.put("/settings", guarantorController.updateSettings);

module.exports = router;
