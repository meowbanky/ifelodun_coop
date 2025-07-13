// controllers/commodity.controller.js
const pool = require("../config/database");
const ResponseHandler = require("../utils/response");

class CommodityController {
  async recordBulkCommodities(req, res) {
    const connection = await pool.getConnection();
    try {
      const { commodities } = req.body;

      if (!Array.isArray(commodities) || commodities.length === 0) {
        return ResponseHandler.error(
          res,
          "Commodities must be a non-empty array",
          400
        );
      }

      await connection.beginTransaction();

      const results = [];
      for (const commodity of commodities) {
        const { memberId, periodId, name, amount, deductionCount } = commodity;

        if (!memberId || !periodId || !name || !amount || !deductionCount) {
          throw new Error("All commodity fields are required");
        }

        const [result] = await connection.execute(
          `INSERT INTO commodities (member_id, period_id, name, amount, deduction_count, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [memberId, periodId, name, amount, deductionCount]
        );

        results.push({
          commodityId: result.insertId,
          memberId,
          name,
          amount,
          deductionCount,
        });
      }

      await connection.commit();
      ResponseHandler.success(
        res,
        results,
        "Bulk commodities recorded successfully",
        201
      );
    } catch (error) {
      await connection.rollback();
      console.error("Record bulk commodities error:", error);
      ResponseHandler.error(
        res,
        error.message || "Failed to record bulk commodities"
      );
    } finally {
      connection.release();
    }
  }

  async getCommoditiesByPeriod(req, res) {
    const connection = await pool.getConnection();
    try {
      const { periodId } = req.params;
      const [commodities] = await connection.execute(
        `SELECT id, member_id, name, amount, deduction_count AS deduction_count
         FROM commodities WHERE period_id = ?`,
        [periodId]
      );
      console.log(`Commodities for period ${periodId}:`, commodities);
      ResponseHandler.success(res, { commodities });
    } catch (error) {
      console.error("Get commodities by period error:", error);
      ResponseHandler.error(res, "Failed to fetch commodities");
    } finally {
      connection.release();
    }
  }

  async deleteCommodity(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params; // Get the commodity ID from the URL

      // Validate that id is provided
      if (!id) {
        return ResponseHandler.error(res, "Commodity ID is required", 400);
      }

      // Check if the commodity exists
      const [existingCommodity] = await connection.execute(
        `SELECT id FROM commodities WHERE id = ?`,
        [id]
      );
      if (existingCommodity.length === 0) {
        return ResponseHandler.error(res, "Commodity not found", 404);
      }

      // Perform the delete operation
      await connection.beginTransaction();
      await connection.execute(`DELETE FROM commodities WHERE id = ?`, [id]);
      await connection.commit();

      ResponseHandler.success(res, null, "Commodity deleted successfully", 200);
    } catch (error) {
      await connection.rollback();
      console.error("Delete commodity error:", error);
      ResponseHandler.error(res, error.message || "Failed to delete commodity");
    } finally {
      connection.release();
    }
  }
}

module.exports = new CommodityController();
