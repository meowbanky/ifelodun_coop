const pool = require("../config/database");
const ResponseHandler = require("../utils/response");
const NotificationService = require("../utils/notification");

class ContributionController {
  async recordContribution(req, res) {
    const connection = await pool.getConnection();
    try {
      const { memberId, amount } = req.body;
      const { periodId } = req.validatedData; // Use validated periodId

      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO contributions (
        member_id, period_id, amount, created_at, created_by, status
      ) VALUES (?, ?, ?, NOW(), ?, ?)`,
        [memberId, periodId, amount, req.user.id, "pending"]
      );

      // Notification logic
      if (result.insertId) {
        const [memberDetails] = await connection.execute(
          "SELECT m.*, u.email FROM members m JOIN users u ON m.user_id = u.id WHERE m.id = ?",
          [memberId]
        );

        if (memberDetails.length > 0) {
          await NotificationService.notify(
            memberDetails[0].user_id,
            "contribution_confirmation",
            {
              memberName: `${memberDetails[0].first_name} ${memberDetails[0].last_name}`,
              amount: amount.toFixed(2),
            }
          ).catch((err) => console.error("Notification error:", err));
        }
      }

      await connection.commit();

      ResponseHandler.success(
        res,
        { contributionId: result.insertId, periodId },
        "Contribution recorded successfully",
        201
      );
    } catch (error) {
      await connection.rollback();
      console.error("Record contribution error:", error);
      ResponseHandler.error(res, "Failed to record contribution");
    } finally {
      connection.release();
    }
  }

  async recordBulkContributions(req, res) {
    const connection = await pool.getConnection();
    try {
      const { contributions } = req.body;

      if (!Array.isArray(contributions) || contributions.length === 0) {
        return ResponseHandler.error(
          res,
          "Contributions must be a non-empty array",
          400
        );
      }

      await connection.beginTransaction();

      const results = [];
      for (const contribution of contributions) {
        const { memberId, periodId, amount } = contribution;

        const [result] = await connection.execute(
          `INSERT INTO contributions (
            member_id, period_id, amount, created_at, created_by
          ) VALUES (?, ?, ?, NOW(), ?)`,
          [memberId, periodId, amount, req.user.id]
        );

        results.push({
          contributionId: result.insertId,
          memberId,
        });
      }

      await connection.commit();
      ResponseHandler.success(
        res,
        results,
        "Bulk contributions recorded successfully",
        201
      );
    } catch (error) {
      await connection.rollback();
      console.error("Record bulk contributions error:", error);
      ResponseHandler.error(res, "Failed to record bulk contributions");
    } finally {
      connection.release();
    }
  }

  async getMemberContributions(req, res) {
    const connection = await pool.getConnection();
    try {
      // Get member's contribution history
      const [contributions] = await connection.execute(
        `SELECT 
          c.*,
          p.name AS period_name,
          u.username AS recorded_by
        FROM contributions c
        JOIN periods p ON c.period_id = p.id
        JOIN users u ON c.created_by = u.id
        WHERE c.member_id = ?
        ORDER BY c.created_at DESC`,
        [req.params.memberId]
      );

      // Get member's total contributions
      const [totals] = await connection.execute(
        `SELECT 
          SUM(amount) AS total_contributions
        FROM contributions
        WHERE member_id = ?`,
        [req.params.memberId]
      );

      ResponseHandler.success(res, {
        contributions,
        summary: totals[0],
      });
    } catch (error) {
      console.error("Get member contributions error:", error);
      ResponseHandler.error(res, "Failed to fetch member contributions");
    } finally {
      connection.release();
    }
  }

  async getContributionsByPeriod(req, res) {
    const connection = await pool.getConnection();
    try {
      const { periodId } = req.params;
      const [contributions] = await connection.execute(
        `SELECT id, member_id, amount
         FROM contributions 
         WHERE period_id = ?`,
        [periodId]
      );
      console.log(`Contributions for period ${periodId}:`, contributions);
      ResponseHandler.success(res, { contributions });
    } catch (error) {
      console.error("Get contributions by period error:", error);
      ResponseHandler.error(res, "Failed to fetch contributions");
    } finally {
      connection.release();
    }
  }

  async deleteContribution(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;

      const [result] = await connection.execute(
        `DELETE FROM contributions WHERE id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return ResponseHandler.error(
          res,
          `Contribution ID ${id} not found`,
          404
        );
      }

      ResponseHandler.success(
        res,
        null,
        `Contribution ID ${id} deleted successfully`
      );
    } catch (error) {
      console.error("Delete contribution error:", error);
      ResponseHandler.error(res, "Failed to delete contribution");
    } finally {
      connection.release();
    }
  }

  async getPeriodContributions(req, res) {
    const connection = await pool.getConnection();
    try {
      // Get all contributions for the period
      const [contributions] = await connection.execute(
        `SELECT 
          c.*,
          m.member_id AS member_number,
          m.first_name,
          m.last_name,
          u.username AS recorded_by
        FROM contributions c
        JOIN members m ON c.member_id = m.id
        JOIN users u ON c.created_by = u.id
        WHERE c.period_id = ?
        ORDER BY c.created_at DESC`,
        [req.params.periodId]
      );

      // Get period summary
      const [summary] = await connection.execute(
        `SELECT 
          COUNT(DISTINCT member_id) AS total_contributors,
          SUM(amount) AS total_contributions
        FROM contributions
        WHERE period_id = ?`,
        [req.params.periodId]
      );

      // Get list of non-contributing members
      const [nonContributors] = await connection.execute(
        `SELECT m.id, m.member_id, m.first_name, m.last_name
        FROM members m
        WHERE m.id NOT IN (
          SELECT DISTINCT member_id 
          FROM contributions 
          WHERE period_id = ?
        )`,
        [req.params.periodId]
      );

      ResponseHandler.success(res, {
        contributions,
        summary: summary[0],
        nonContributors,
      });
    } catch (error) {
      console.error("Get period contributions error:", error);
      ResponseHandler.error(res, "Failed to fetch period contributions");
    } finally {
      connection.release();
    }
  }

  // Remove approveContribution since there's no status column
  async getSettings(req, res) {
    const connection = await pool.getConnection();
    try {
      const [settings] = await connection.execute(
        "SELECT * FROM contribution_settings ORDER BY id DESC LIMIT 1"
      );

      if (settings.length === 0) {
        return ResponseHandler.error(
          res,
          "Contribution settings not found",
          404
        );
      }

      ResponseHandler.success(res, settings[0]);
    } catch (error) {
      console.error("Get settings error:", error);
      ResponseHandler.error(res, "Failed to fetch contribution settings");
    } finally {
      connection.release();
    }
  }

  async updateSettings(req, res) {
    const connection = await pool.getConnection();
    try {
      const { sharesRatio, savingsRatio, minimumMonthlyContribution } =
        req.body;

      // Validate ratios
      if (parseFloat(sharesRatio) + parseFloat(savingsRatio) !== 100) {
        return ResponseHandler.error(
          res,
          "Shares ratio and savings ratio must sum to 100%",
          400
        );
      }

      // Insert new settings
      await connection.execute(
        `INSERT INTO contribution_settings (
          shares_ratio,
          savings_ratio,
          minimum_monthly_contribution
        ) VALUES (?, ?, ?)`,
        [sharesRatio, savingsRatio, minimumMonthlyContribution]
      );

      ResponseHandler.success(
        res,
        null,
        "Contribution settings updated successfully"
      );
    } catch (error) {
      console.error("Update settings error:", error);
      ResponseHandler.error(res, "Failed to update contribution settings");
    } finally {
      connection.release();
    }
  }
}

module.exports = new ContributionController();
