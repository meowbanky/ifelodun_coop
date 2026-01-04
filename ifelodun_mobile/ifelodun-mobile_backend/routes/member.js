const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// Optional: JWT middleware for security (remove if not needed)
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token required" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// ===================
// GET /api/member/:id/summary
// ===================
router.get(
  "/:id/summary",
  /* authenticateToken, */ async (req, res) => {
    const memberId = req.params.id;

    try {
      const connection = await pool.getConnection();

      // 1. Total Shares + Savings
      const [[shareSavings]] = await connection.query(
        `SELECT COALESCE(SUM(shares), 0) + COALESCE(SUM(savings), 0) AS total_share_savings
       FROM member_balances WHERE member_id = ?`,
        [memberId]
      );

      // 2. Loan Balance (active loans)
      const [[loanRepay]] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) AS loan_repayment
       FROM loan_repayments WHERE member_id = ?`,
        [memberId]
      );

      // 3. Unpaid Interest (charged - paid)
      const [[interest]] = await connection.query(
        `SELECT 
          (COALESCE((SELECT SUM(amount) FROM interest_charged WHERE member_id = ?), 0) -
           COALESCE((SELECT SUM(amount) FROM interest_paid WHERE member_id = ?), 0)
          ) AS unpaid_interest`,
        [memberId, memberId]
      );

      // 4. Total Loan (all granted loans)
      const [[totalLoan]] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_loan
       FROM loans WHERE member_id = ? AND status IN ('approved', 'active', 'completed')`,
        [memberId]
      );

      connection.release();

      res.json({
        total_share_savings: parseFloat(shareSavings.total_share_savings),
        loan_balance:
          parseFloat(totalLoan.total_loan) -
          parseFloat(loanRepay.loan_repayment),
        unpaid_interest: parseFloat(interest.unpaid_interest),
        total_loan: parseFloat(totalLoan.total_loan),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching member summary" });
    }
  }
);

// Transaction History Endpoint
router.get("/:memberId/history", authenticateToken, async (req, res) => {
  const memberId = req.params.memberId;
  const fromId = parseInt(req.query.from, 10);
  const toId = parseInt(req.query.to, 10);

  if (!fromId || !toId || !memberId) {
    return res.status(400).json({ error: "Missing period range or memberId" });
  }

  try {
    const [rows] = await pool.query(
      `
      WITH AggregatedData AS (
        SELECT
          m.id AS member_id_num,
          m.member_id,
          m.first_name,
          m.last_name,
          p.id AS period_id,
          p.name AS period_name,
          COALESCE(SUM(mb.shares), 0) AS shares_amount,
          COALESCE(SUM(mb.savings), 0) AS savings_amount,
          COALESCE(SUM(l.amount), 0) AS loan_amount,
          COALESCE(SUM(lr.amount), 0) AS loan_repayment,
          COALESCE(SUM(ic.amount), 0) AS interest_charged,
          COALESCE(SUM(ip.amount), 0) AS interest_paid,
          COALESCE(SUM(c.amount), 0) AS commodity_amount,
          COALESCE(SUM(cr.amount), 0) AS commodity_repayment,
          COALESCE(SUM(dlf.amount), 0) AS dev_levy,
          COALESCE(SUM(sf.amount), 0) AS stationery,
          COALESCE(SUM(ef.amount), 0) AS entry_fees
        FROM members m
        CROSS JOIN periods p
        LEFT JOIN member_balances mb ON m.id = mb.member_id AND p.id = mb.period_id
        LEFT JOIN loans l ON m.id = l.member_id AND p.id = l.period_id
        LEFT JOIN loan_repayments lr ON m.id = lr.member_id AND p.id = lr.period_id
        LEFT JOIN interest_charged ic ON m.id = ic.member_id AND p.id = ic.period_id
        LEFT JOIN interest_paid ip ON m.id = ip.member_id AND p.id = ip.period_id
        LEFT JOIN commodities c ON m.id = c.member_id AND p.id = c.period_id
        LEFT JOIN commodity_repayments cr ON m.id = cr.member_id AND p.id = cr.period_id
        LEFT JOIN development_levy_fees dlf ON m.id = dlf.member_id AND p.id = dlf.period_id
        LEFT JOIN stationery_fees sf ON m.id = sf.member_id AND p.id = sf.period_id
        LEFT JOIN entry_fees ef ON m.id = ef.member_id AND p.id = ef.period_id
        WHERE p.id BETWEEN ? AND ? AND m.id = ?
        GROUP BY m.id, m.member_id, m.first_name, m.last_name, p.id, p.name
      )
      SELECT 
        member_id_num,
        member_id,
        first_name,
        last_name,
        period_id,
        period_name,
        shares_amount,
        COALESCE(SUM(shares_amount) OVER (PARTITION BY member_id_num ORDER BY period_id), 0) AS shares_balance,
        savings_amount,
        COALESCE(SUM(savings_amount) OVER (PARTITION BY member_id_num ORDER BY period_id), 0) AS savings_balance,
        loan_amount,
        loan_repayment,
        COALESCE(
          SUM(loan_amount) OVER (PARTITION BY member_id_num ORDER BY period_id)
          - SUM(loan_repayment) OVER (PARTITION BY member_id_num ORDER BY period_id),
          0
        ) AS loan_balance,
        interest_charged,
        interest_paid,
        COALESCE(
          SUM(interest_charged - interest_paid) OVER (PARTITION BY member_id_num ORDER BY period_id),
          0
        ) AS unpaid_interest,
        commodity_amount,
        commodity_repayment,
        COALESCE(
          SUM(commodity_amount - commodity_repayment) OVER (PARTITION BY member_id_num ORDER BY period_id),
          0
        ) AS commodity_balance,
        dev_levy,
        stationery,
        entry_fees
      FROM AggregatedData
      ORDER BY period_id;
      `,
      [fromId, toId, memberId]
    );
    res.json({ data: rows });
  } catch (error) {
    console.error("History report error:", error);
    res.status(500).json({ error: "Error fetching history report" });
  }
});

// ===================
// [Sample] Get Member Profile Info
// ===================
router.get(
  "/:id/profile",
  /* authenticateToken, */ async (req, res) => {
    const memberId = req.params.id;
    try {
      const connection = await pool.getConnection();
      const [[profile]] = await connection.query(
        `SELECT first_name, last_name, email, phone_number, address, membership_date
       FROM members WHERE id = ?`,
        [memberId]
      );
      connection.release();

      if (!profile) {
        return res.status(404).json({ error: "Member not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching profile" });
    }
  }
);

router.get("/:memberId/settings", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const memberId = parseInt(req.params.memberId, 10);

    const [rows] = await connection.execute(
      "SELECT id, allow_savings_with_loan, savings_with_loan_amount FROM members WHERE id = ?",
      [memberId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    const member = rows[0];
    res.json({
      data: {
        allow_savings_with_loan: !!member.allow_savings_with_loan,
        savings_with_loan_amount:
          Number(member.savings_with_loan_amount) || 0.0,
      },
      message: `Settings for member ID ${memberId} retrieved successfully`,
    });
  } catch (error) {
    console.error("Get member settings error:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to retrieve settings" });
  } finally {
    connection.release();
  }
});

router.put("/:memberId/settings", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const { allow_savings_with_loan, savings_with_loan_amount } = req.body;

    // Validation as before...
    if (typeof allow_savings_with_loan !== "boolean") {
      return res
        .status(400)
        .json({ error: "allow_savings_with_loan must be a boolean." });
    }
    if (
      typeof savings_with_loan_amount !== "number" ||
      isNaN(savings_with_loan_amount)
    ) {
      return res
        .status(400)
        .json({ error: "savings_with_loan_amount must be a number." });
    }
    if (savings_with_loan_amount < 0) {
      return res
        .status(400)
        .json({ error: "savings_with_loan_amount must be positive." });
    }
    if (allow_savings_with_loan && savings_with_loan_amount === 0) {
      return res.status(400).json({
        error: "Please enter a savings amount when allowing savings with loan.",
      });
    }

    // Check member exists
    const [rows] = await connection.execute(
      "SELECT id FROM members WHERE id = ?",
      [memberId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Update settings
    await connection.execute(
      "UPDATE members SET allow_savings_with_loan = ?, savings_with_loan_amount = ?, updated_at = NOW() WHERE id = ?",
      [allow_savings_with_loan, savings_with_loan_amount, memberId]
    );

    res.json({
      message: `Settings for member ID ${memberId} updated successfully`,
    });
  } catch (error) {
    console.error("Update member settings error:", error.message, error.stack);
    res
      .status(500)
      .json({ error: error.message || "Failed to update settings" });
  } finally {
    connection.release();
  }
});

router.get("/member/:id/profile", authenticateToken, async (req, res) => {
  const memberId = parseInt(req.params.id, 10);
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `
      SELECT
        m.id AS member_id,
        m.member_id AS member_code,
        m.first_name,
        m.last_name,
        m.middle_name,
        m.phone_number,
        m.email,
        m.address,
        m.date_of_birth,
        m.gender,
        m.membership_date,
        m.employment_status,
        m.membership_status,
        m.allow_savings_with_loan,
        m.savings_with_loan_amount,
        nok.id AS nok_id,
        nok.first_name AS nok_first_name,
        nok.last_name AS nok_last_name,
        nok.relationship,
        nok.phone_number AS nok_phone,
        nok.address AS nok_address
      FROM members m
      LEFT JOIN next_of_kin nok ON m.id = nok.member_id
      WHERE m.id = ?
      `,
      [memberId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    // There could be multiple next of kin
    const member = {
      member_id: rows[0].member_id,
      member_code: rows[0].member_code,
      first_name: rows[0].first_name,
      last_name: rows[0].last_name,
      middle_name: rows[0].middle_name,
      phone_number: rows[0].phone_number,
      email: rows[0].email,
      address: rows[0].address,
      date_of_birth: rows[0].date_of_birth,
      gender: rows[0].gender,
      membership_date: rows[0].membership_date,
      employment_status: rows[0].employment_status,
      membership_status: rows[0].membership_status,
      allow_savings_with_loan: rows[0].allow_savings_with_loan,
      savings_with_loan_amount: rows[0].savings_with_loan_amount,
      next_of_kin: rows
        .filter((r) => r.nok_id !== null)
        .map((r) => ({
          id: r.nok_id,
          first_name: r.nok_first_name,
          last_name: r.nok_last_name,
          relationship: r.relationship,
          phone_number: r.nok_phone,
          address: r.nok_address,
        })),
    };

    res.json({ data: member });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching profile" });
  } finally {
    connection.release();
  }
});

module.exports = router;
