const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const authMiddleware = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all categories
router.get("/", categoryController.getCategories);

// Get categories by type (income/expense)
router.get("/type/:type", categoryController.getCategoriesByType);

// Add a new category
router.post("/", categoryController.addCategory);

// Update a category
router.put("/:id", categoryController.updateCategory);

// Delete a category
router.delete("/:id", categoryController.deleteCategory);

module.exports = router; 