// controllers/fee.controller.js
const pool = require("../config/database");
const ResponseHandler = require("../utils/response");

class FeeController {
  async getFeeConfigs(req, res) {
    const connection = await pool.getConnection();
    try {
      const [fees] = await connection.execute(
        `SELECT id, fee_type, amount, description FROM fixed_fees_config`
      );
      ResponseHandler.success(res, fees);
    } catch (error) {
      console.error("Get fee configs error:", error);
      ResponseHandler.error(res, "Failed to fetch fee configurations");
    } finally {
      connection.release();
    }
  }

  async addFeeConfig(req, res) {
    const connection = await pool.getConnection();
    try {
      const { fee_type, amount, description } = req.body;
      if (!fee_type || !amount) {
        return ResponseHandler.error(
          res,
          "Fee type and amount are required",
          400
        );
      }
      await connection.execute(
        `INSERT INTO fixed_fees_config (fee_type, amount, description) VALUES (?, ?, ?)`,
        [fee_type, amount, description || null]
      );
      ResponseHandler.success(
        res,
        null,
        "Fee configuration added successfully",
        201
      );
    } catch (error) {
      console.error("Add fee config error:", error);
      ResponseHandler.error(res, "Failed to add fee configuration");
    } finally {
      connection.release();
    }
  }

  async updateFeeConfig(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { amount, description } = req.body;
      if (!amount) {
        return ResponseHandler.error(res, "Amount is required", 400);
      }
      const [result] = await connection.execute(
        `UPDATE fixed_fees_config SET amount = ?, description = ? WHERE id = ?`,
        [amount, description || null, id]
      );
      if (result.affectedRows === 0) {
        return ResponseHandler.error(res, "Fee configuration not found", 404);
      }
      ResponseHandler.success(
        res,
        null,
        "Fee configuration updated successfully"
      );
    } catch (error) {
      console.error("Update fee config error:", error);
      ResponseHandler.error(res, "Failed to update fee configuration");
    } finally {
      connection.release();
    }
  }
}

module.exports = new FeeController();
