const pool = require("../config/database");
const ResponseHandler = require("../utils/response");

class CategoryController {
  // Get all categories
  async getCategories(req, res) {
    const connection = await pool.getConnection();
    try {
      const [categories] = await connection.execute(
        `SELECT id, name, type, created_at FROM transaction_categories ORDER BY name`
      );
      ResponseHandler.success(
        res,
        categories,
        "Categories retrieved successfully"
      );
    } catch (error) {
      console.error("Get categories error:", error.message, error.stack);
      ResponseHandler.error(
        res,
        error.message || "Failed to fetch categories",
        500
      );
    } finally {
      connection.release();
    }
  }

  // Add a new category
  async addCategory(req, res) {
    const connection = await pool.getConnection();
    try {
      const { name, type } = req.body;
      const createdBy = req.user.id;

      if (!name || !type) {
        return ResponseHandler.error(
          res,
          "Category name and type are required",
          400
        );
      }

      // Check if category already exists
      const [existing] = await connection.execute(
        `SELECT id FROM transaction_categories WHERE name = ? AND type = ?`,
        [name, type]
      );
      if (existing.length > 0) {
        return ResponseHandler.error(
          res,
          `Category "${name}" already exists for type "${type}"`,
          400
        );
      }

      await connection.execute(
        `INSERT INTO transaction_categories (name, type, created_by, created_at) 
         VALUES (?, ?, ?, NOW())`,
        [name, type, createdBy]
      );

      ResponseHandler.success(
        res,
        null,
        `Category "${name}" added successfully`,
        201
      );
    } catch (error) {
      console.error("Add category error:", error.message, error.stack);
      ResponseHandler.error(
        res,
        error.message || "Failed to add category",
        500
      );
    } finally {
      connection.release();
    }
  }

  // Update a category
  async updateCategory(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { name, type } = req.body;

      if (!name || !type) {
        return ResponseHandler.error(
          res,
          "Category name and type are required",
          400
        );
      }

      // Check if category exists
      const [existing] = await connection.execute(
        `SELECT id FROM transaction_categories WHERE id = ?`,
        [id]
      );
      if (existing.length === 0) {
        return ResponseHandler.error(res, "Category not found", 404);
      }

      // Check if new name conflicts with existing category
      const [conflict] = await connection.execute(
        `SELECT id FROM transaction_categories WHERE name = ? AND type = ? AND id != ?`,
        [name, type, id]
      );
      if (conflict.length > 0) {
        return ResponseHandler.error(
          res,
          `Category "${name}" already exists for type "${type}"`,
          400
        );
      }

      await connection.execute(
        `UPDATE transaction_categories SET name = ?, type = ? WHERE id = ?`,
        [name, type, id]
      );

      ResponseHandler.success(res, null, "Category updated successfully");
    } catch (error) {
      console.error("Update category error:", error.message, error.stack);
      ResponseHandler.error(
        res,
        error.message || "Failed to update category",
        500
      );
    } finally {
      connection.release();
    }
  }

  // Delete a category
  async deleteCategory(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;

      // Check if category is being used in transactions
      const [usage] = await connection.execute(
        `SELECT COUNT(*) as count FROM coop_transactions WHERE category_id = ?`,
        [id]
      );
      if (usage[0].count > 0) {
        return ResponseHandler.error(
          res,
          "Cannot delete category that is being used in transactions",
          400
        );
      }

      const [result] = await connection.execute(
        `DELETE FROM transaction_categories WHERE id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return ResponseHandler.error(res, "Category not found", 404);
      }

      ResponseHandler.success(res, null, "Category deleted successfully");
    } catch (error) {
      console.error("Delete category error:", error.message, error.stack);
      ResponseHandler.error(
        res,
        error.message || "Failed to delete category",
        500
      );
    } finally {
      connection.release();
    }
  }

  // Get categories by type
  async getCategoriesByType(req, res) {
    const connection = await pool.getConnection();
    try {
      const { type } = req.params;

      const [categories] = await connection.execute(
        `SELECT id, name FROM transaction_categories WHERE type = ? ORDER BY name`,
        [type]
      );

      ResponseHandler.success(
        res,
        categories,
        "Categories retrieved successfully"
      );
    } catch (error) {
      console.error(
        "Get categories by type error:",
        error.message,
        error.stack
      );
      ResponseHandler.error(
        res,
        error.message || "Failed to fetch categories",
        500
      );
    } finally {
      connection.release();
    }
  }
}

module.exports = new CategoryController();
