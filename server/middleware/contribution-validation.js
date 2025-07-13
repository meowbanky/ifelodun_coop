const pool = require("../config/database");
const ResponseHandler = require("../utils/response");

class ContributionValidation {
  static async validateContribution(req, res, next) {
    const connection = await pool.getConnection();
    try {
      // Handle both single contribution (/record) and bulk contributions (/bulk)
      const contributions = req.body.contributions
        ? req.body.contributions
        : [req.body];

      if (!Array.isArray(contributions) || contributions.length === 0) {
        return ResponseHandler.error(
          res,
          "Contributions must be a non-empty array or a single contribution object",
          400
        );
      }

      const [periodResult] = await connection.execute(
        `SELECT id, status 
         FROM periods 
         WHERE status = 'open'`
      );

      if (periodResult.length === 0) {
        return ResponseHandler.error(res, "No active period found", 400);
      }

      const periodId = periodResult[0].id;

      const [settingsResult] = await connection.execute(
        `SELECT minimum_monthly_contribution 
         FROM contribution_settings 
         ORDER BY id DESC LIMIT 1`
      );

      if (settingsResult.length === 0) {
        return ResponseHandler.error(
          res,
          "Contribution settings not found",
          500
        );
      }

      const settings = settingsResult[0];

      for (const contribution of contributions) {
        const { memberId, amount } = contribution;

        console.log("Validating:", { memberId, amount });

        if (!memberId || amount === undefined) {
          return ResponseHandler.error(
            res,
            "Member ID and amount are required for all contributions",
            400
          );
        }

        const [memberResult] = await connection.execute(
          `SELECT id, membership_status 
           FROM members 
           WHERE id = ?`,
          [memberId]
        );

        if (memberResult.length === 0) {
          return ResponseHandler.error(res, "Member not found", 404);
        }

        if (memberResult[0].membership_status !== "active") {
          return ResponseHandler.error(res, "Member is not active", 400);
        }

        if (amount < settings.minimum_monthly_contribution) {
          return ResponseHandler.error(
            res,
            `Contribution must be at least ₦${settings.minimum_monthly_contribution}`,
            400
          );
        }

        // const [existingContribution] = await connection.execute(
        //   `SELECT id 
        //    FROM contributions 
        //    WHERE member_id = ? AND period_id = ?`,
        //   [memberId, periodId]
        // );

        // if (existingContribution.length > 0) {
        //   return ResponseHandler.error(
        //     res,
        //     "Member has already contributed for this period",
        //     400
        //   );
        // }
      }

      // Attach validated data to the request
      req.validatedData = {
        periodId: periodResult[0].id,
      };

      next();
    } catch (error) {
      console.error("Contribution validation error:", error);
      ResponseHandler.error(res, "Validation failed");
    } finally {
      connection.release();
    }
  }

  static async logValidation(contributionId, status, message) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO contribution_validations 
         (contribution_id, validation_status, validation_message) 
         VALUES (?, ?, ?)`,
        [contributionId, status, message]
      );
    } catch (error) {
      console.error("Validation logging error:", error);
    } finally {
      connection.release();
    }
  }
}

module.exports = ContributionValidation;
