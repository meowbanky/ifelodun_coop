const pool = require("../config/database");
const ResponseHandler = require("../utils/response");

class CoopTransactionController {
  // Add a new income or expenditure
  async addTransaction(req, res) {
    const connection = await pool.getConnection();
    try {
      const { type, amount, description, category, periodId } = req.body;
      const created_by = req.user?.id || null;

      if (!type || !amount || !category || !periodId) {
        return ResponseHandler.error(
          res,
          "All fields (including period) are required",
          400
        );
      }

      if (!["income", "expense"].includes(type)) {
        return ResponseHandler.error(
          res,
          "Type must be 'income' or 'expense'",
          400
        );
      }

      // Get category ID from category name
      const [categoryResult] = await connection.execute(
        `SELECT id FROM transaction_categories WHERE name = ? AND type = ?`,
        [category, type]
      );

      if (categoryResult.length === 0) {
        return ResponseHandler.error(
          res,
          `Category "${category}" not found for type "${type}"`,
          400
        );
      }

      const categoryId = categoryResult[0].id;

      await connection.execute(
        `INSERT INTO coop_transactions (type, amount, description, category, category_id, created_by, created_at, period_id)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [type, amount, description, category, categoryId, created_by, periodId]
      );

      ResponseHandler.success(res, null, "Transaction recorded successfully");
    } catch (error) {
      console.error("Add coop transaction error:", error);
      ResponseHandler.error(res, error.message || "Failed to add transaction");
    } finally {
      connection.release();
    }
  }

  // List all transactions (optionally filter by type/category/periodId)
  async listTransactions(req, res) {
    const connection = await pool.getConnection();
    try {
      const { type, category, periodId } = req.query;
      let query = `
        SELECT ct.*, tc.name as category_name 
        FROM coop_transactions ct
        LEFT JOIN transaction_categories tc ON ct.category_id = tc.id
        WHERE 1=1
      `;
      const params = [];

      if (type) {
        query += ` AND ct.type = ?`;
        params.push(type);
      }
      if (category) {
        query += ` AND ct.category = ?`;
        params.push(category);
      }
      if (periodId) {
        query += ` AND ct.period_id = ?`;
        params.push(periodId);
      }

      query += ` ORDER BY ct.created_at DESC, ct.id DESC`;
      const [rows] = await connection.execute(query, params);
      ResponseHandler.success(res, rows);
    } catch (error) {
      console.error("List coop transactions error:", error);
      ResponseHandler.error(
        res,
        error.message || "Failed to fetch transactions"
      );
    } finally {
      connection.release();
    }
  }

  // Delete a transaction
  async deleteTransaction(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const [result] = await connection.execute(
        `DELETE FROM coop_transactions WHERE id = ?`,
        [id]
      );
      if (result.affectedRows === 0) {
        return ResponseHandler.error(res, "Transaction not found", 404);
      }
      ResponseHandler.success(res, null, "Transaction deleted successfully");
    } catch (error) {
      console.error("Delete coop transaction error:", error);
      ResponseHandler.error(
        res,
        error.message || "Failed to delete transaction"
      );
    } finally {
      connection.release();
    }
  }

  // Update a transaction
  async updateTransaction(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { type, amount, description, category, periodId } = req.body;
      if (!type || !amount || !category || !periodId) {
        return ResponseHandler.error(
          res,
          "All fields (including period) are required",
          400
        );
      }
      if (!["income", "expense"].includes(type)) {
        return ResponseHandler.error(
          res,
          "Type must be 'income' or 'expense'",
          400
        );
      }
      // Get category ID from category name
      const [categoryResult] = await connection.execute(
        `SELECT id FROM transaction_categories WHERE name = ? AND type = ?`,
        [category, type]
      );
      if (categoryResult.length === 0) {
        return ResponseHandler.error(
          res,
          `Category "${category}" not found for type "${type}"`,
          400
        );
      }
      const categoryId = categoryResult[0].id;
      const [result] = await connection.execute(
        `UPDATE coop_transactions SET type = ?, amount = ?, description = ?, category = ?, category_id = ?, period_id = ? WHERE id = ?`,
        [type, amount, description, category, categoryId, periodId, id]
      );
      if (result.affectedRows === 0) {
        return ResponseHandler.error(res, "Transaction not found", 404);
      }
      ResponseHandler.success(res, null, "Transaction updated successfully");
    } catch (error) {
      console.error("Update coop transaction error:", error);
      ResponseHandler.error(
        res,
        error.message || "Failed to update transaction"
      );
    } finally {
      connection.release();
    }
  }
}

module.exports = new CoopTransactionController();
