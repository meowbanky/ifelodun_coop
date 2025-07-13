// controllers/loan.controller.js
const pool = require("../config/database");
const ResponseHandler = require("../utils/response");

class LoanController {
  async grantLoan(req, res) {
    const connection = await pool.getConnection();
    try {
      const { memberId, periodId, loanType, amount, interestRate, grantDate } =
        req.body;

      if (
        !memberId ||
        !periodId ||
        !loanType ||
        !amount ||
        !interestRate ||
        !grantDate
      ) {
        return ResponseHandler.error(res, "All loan fields are required", 400);
      }

      // Validate grantDate format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(grantDate)) {
        return ResponseHandler.error(
          res,
          "Invalid date format. Use YYYY-MM-DD",
          400
        );
      }

      await connection.beginTransaction();

      const [memberCheck] = await connection.execute(
        `SELECT id FROM members WHERE id = ? AND membership_status = 'active'`,
        [memberId]
      );
      if (memberCheck.length === 0) {
        return ResponseHandler.error(
          res,
          `Member ID ${memberId} not found or not active`,
          404
        );
      }

      const [periodCheck] = await connection.execute(
        `SELECT id FROM periods WHERE id = ? AND status = 'open'`,
        [periodId]
      );
      if (periodCheck.length === 0) {
        return ResponseHandler.error(
          res,
          `Period ID ${periodId} not found or not open`,
          400
        );
      }

      const [loanTypeCheck] = await connection.execute(
        `SELECT id, maximum_amount, maximum_term FROM loan_types WHERE name = ?`,
        [loanType]
      );
      if (loanTypeCheck.length === 0) {
        return ResponseHandler.error(
          res,
          `Loan type "${loanType}" not found`,
          404
        );
      }
      const { id: loanTypeId, maximum_amount, maximum_term } = loanTypeCheck[0];

      if (amount > maximum_amount) {
        return ResponseHandler.error(
          res,
          `Loan amount exceeds maximum of ₦${maximum_amount} for ${loanType}`,
          400
        );
      }

      // Insert loan with user-provided grant_date instead of default NOW()
      const [result] = await connection.execute(
        `INSERT INTO loans (member_id, period_id, loan_type_id, amount, interest_rate, term, application_date, status, grant_date)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'pending', ?)`,
        [
          memberId,
          periodId,
          loanTypeId,
          amount,
          interestRate,
          maximum_term,
          grantDate,
        ]
      );

      const loanId = result.insertId;
      await connection.commit();

      // Fetch the newly created loan to return
      const [loans] = await connection.execute(
        `SELECT l.id, l.member_id, lt.name AS loan_type, l.amount, l.interest_rate, l.grant_date, l.status, l.application_date
         FROM loans l
         JOIN loan_types lt ON l.loan_type_id = lt.id
         WHERE l.id = ?`,
        [loanId]
      );

      ResponseHandler.success(res, loans[0], "Loan granted successfully", 201);
    } catch (error) {
      await connection.rollback();
      console.error("Grant loan error:", error);
      ResponseHandler.error(res, error.message || "Failed to grant loan");
    } finally {
      connection.release();
    }
  }

  async getPendingLoansByPeriod(req, res) {
    const connection = await pool.getConnection();
    try {
      const { periodId } = req.params;
      const [loans] = await connection.execute(
        `SELECT 
           l.id, 
           l.member_id, 
           lt.name AS loan_type, 
           l.amount, 
           l.interest_rate, 
           l.application_date,
           l.grant_date
         FROM loans l
         LEFT JOIN loan_types lt ON l.loan_type_id = lt.id
         WHERE l.period_id = ?`,
        [periodId]
      );
      console.log(`Pending loans for period ${periodId}:`, loans);
      ResponseHandler.success(res, loans);
    } catch (error) {
      console.error("Get pending loans error:", error);
      ResponseHandler.error(res, "Failed to fetch pending loans");
    } finally {
      connection.release();
    }
  }

  async deleteLoan(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const [result] = await connection.execute(
        `DELETE FROM loans WHERE id = ? AND status = 'pending'`, // Only allow deletion of pending loans
        [id]
      );

      if (result.affectedRows === 0) {
        return ResponseHandler.error(
          res,
          `Loan ID ${id} not found or not pending`,
          404
        );
      }

      ResponseHandler.success(res, null, `Loan ID ${id} deleted successfully`);
    } catch (error) {
      console.error("Delete loan error:", error);
      ResponseHandler.error(res, "Failed to delete loan");
    } finally {
      connection.release();
    }
  }

  async getMemberLoans(req, res) {
    const connection = await pool.getConnection();
    try {
      const { memberId } = req.params;

      // Query to get loan details and calculate outstanding balance
      const [loans] = await connection.execute(
        `SELECT 
          l.id,
          lt.name AS loan_type,
          l.amount,
          l.interest_rate,
          l.grant_date, -- Updated to use grant_date
          l.status,
          (l.amount - COALESCE(SUM(lr.amount), 0)) AS outstanding_balance
        FROM loans l
        LEFT JOIN loan_types lt ON l.loan_type_id = lt.id
        LEFT JOIN loan_repayments lr ON l.id = lr.loan_id 
          AND lr.status = 'paid' 
          AND lr.payment_date IS NOT NULL
        WHERE l.member_id = ? AND l.status = 'active'
        GROUP BY l.id, lt.name, l.amount, l.interest_rate, l.grant_date, l.status`,
        [memberId]
      );

      // Calculate total outstanding balance across all active loans
      const totalOutstandingBalance = loans.reduce(
        (sum, loan) => sum + (loan.outstanding_balance || 0),
        0
      );

      console.log(`Loans for member ${memberId}:`, loans);
      ResponseHandler.success(res, {
        loans,
        totalOutstandingBalance,
      });
    } catch (error) {
      console.error("Get member loans error:", error);
      ResponseHandler.error(res, "Failed to fetch loans");
    } finally {
      connection.release();
    }
  }

  async getMemberBalances(req, res) {
    const connection = await pool.getConnection();
    try {
      const { memberId } = req.params;
      const [balances] = await connection.execute(
        `SELECT shares as total_shares, savings as total_savings FROM member_balances WHERE member_id = ?`,
        [memberId]
      );
      ResponseHandler.success(
        res,
        balances[0] || { total_shares: 0, total_savings: 0 }
      );
    } catch (error) {
      console.error("Get member balances error:", error);
      ResponseHandler.error(res, "Failed to fetch balances");
    } finally {
      connection.release();
    }
  }

  async getMemberCumulativeBalances(req, res) {
    const connection = await pool.getConnection();
    try {
      const { memberId } = req.params;

      // Get cumulative balances across all periods
      const [balances] = await connection.execute(
        `SELECT 
          COALESCE(SUM(shares), 0) as total_shares, 
          COALESCE(SUM(savings), 0) as total_savings 
          FROM member_balances WHERE member_id = ?`,
        [memberId]
      );

      ResponseHandler.success(
        res,
        balances[0] || { total_shares: 0, total_savings: 0 }
      );
    } catch (error) {
      console.error("Get member cumulative balances error:", error);
      ResponseHandler.error(res, "Failed to fetch cumulative balances");
    } finally {
      connection.release();
    }
  }

  async listLoanTypes(req, res) {
    const connection = await pool.getConnection();
    try {
      const [loanTypes] = await connection.execute(
        `SELECT id, name, description, interest_rate, maximum_amount, maximum_term, 
         minimum_membership_duration, minimum_shares_percentage 
         FROM loan_types`
      );
      ResponseHandler.success(res, loanTypes);
    } catch (error) {
      console.error("List loan types error:", error);
      ResponseHandler.error(res, "Failed to fetch loan types");
    } finally {
      connection.release();
    }
  }

  async editLoan(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { loanType, amount, interestRate, grantDate } = req.body;

      if (!loanType || !amount || !interestRate || !grantDate) {
        return ResponseHandler.error(res, "All loan fields are required", 400);
      }

      await connection.beginTransaction();

      const [loanCheck] = await connection.execute(
        `SELECT l.id, l.status FROM loans l WHERE l.id = ?`,
        [id]
      );
      if (loanCheck.length === 0) {
        return ResponseHandler.error(res, `Loan ID ${id} not found`, 404);
      }
      const { status } = loanCheck[0];
      if (status !== "pending") {
        return ResponseHandler.error(
          res,
          `Loan ID ${id} cannot be edited as it is ${status}`,
          400
        );
      }

      const [loanTypeCheck] = await connection.execute(
        `SELECT id, maximum_amount FROM loan_types WHERE name = ?`,
        [loanType]
      );
      if (loanTypeCheck.length === 0) {
        return ResponseHandler.error(
          res,
          `Loan type "${loanType}" not found`,
          404
        );
      }
      const { id: loanTypeId, maximum_amount } = loanTypeCheck[0];

      if (amount > maximum_amount) {
        return ResponseHandler.error(
          res,
          `Loan amount exceeds maximum of ₦${maximum_amount} for ${loanType}`,
          400
        );
      }

      await connection.execute(
        `UPDATE loans 
         SET loan_type_id = ?, amount = ?, interest_rate = ?, grant_date = ? 
         WHERE id = ?`,
        [loanTypeId, amount, interestRate, grantDate, id]
      );

      await connection.commit();
      ResponseHandler.success(res, null, `Loan ID ${id} updated successfully`);
    } catch (error) {
      await connection.rollback();
      console.error("Edit loan error:", error);
      ResponseHandler.error(res, error.message || "Failed to edit loan");
    } finally {
      connection.release();
    }
  }

  async getTotalLoansByPeriod(req, res) {
    const connection = await pool.getConnection();
    try {
      const { periodId } = req.params;
      const [result] = await connection.execute(
        `SELECT COALESCE(SUM(amount), 0) AS total_amount 
         FROM loans 
         WHERE period_id = ?`,
        [periodId]
      );
      const totalAmount = result[0].total_amount;
      console.log(`Total loans for period ${periodId}:`, totalAmount);
      ResponseHandler.success(res, { totalAmount });
    } catch (error) {
      console.error("Get total loans error:", error);
      ResponseHandler.error(res, "Failed to fetch total loans");
    } finally {
      connection.release();
    }
  }
}

module.exports = new LoanController();
