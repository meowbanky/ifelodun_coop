const pool = require("../config/database");
const ResponseHandler = require("../utils/response");

class GuarantorController {
  async getSettings(req, res) {
    const connection = await pool.getConnection();
    try {
      console.log("Fetching guarantor settings...");
      const [settings] = await connection.execute(
        "SELECT * FROM guarantor_settings ORDER BY id DESC LIMIT 1"
      );

      if (settings.length === 0) {
        return ResponseHandler.error(res, "Guarantor settings not found", 404);
      }

      ResponseHandler.success(res, settings[0]);
    } catch (error) {
      console.error("Get guarantor settings error:", error);
      ResponseHandler.error(res, "Failed to fetch guarantor settings");
    } finally {
      connection.release();
    }
  }

  async updateSettings(req, res) {
    const connection = await pool.getConnection();
    try {
      const {
        minimum_shares_balance,
        maximum_guarantees_allowed,
        guarantee_percentage_limit,
      } = req.body;

      if (
        minimum_shares_balance < 0 ||
        maximum_guarantees_allowed < 1 ||
        guarantee_percentage_limit < 0
      ) {
        return ResponseHandler.error(res, "Invalid settings values", 400);
      }

      await connection.execute(
        `INSERT INTO guarantor_settings (
          minimum_shares_balance,
          maximum_guarantees_allowed,
          guarantee_percentage_limit
        ) VALUES (?, ?, ?)`,
        [
          minimum_shares_balance,
          maximum_guarantees_allowed,
          guarantee_percentage_limit,
        ]
      );

      ResponseHandler.success(
        res,
        null,
        "Guarantor settings updated successfully"
      );
    } catch (error) {
      console.error("Update guarantor settings error:", error);
      ResponseHandler.error(res, "Failed to update guarantor settings");
    } finally {
      connection.release();
    }
  }
}

module.exports = new GuarantorController();
