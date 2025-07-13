const pool = require("../config/database");
const ResponseHandler = require("../utils/response");
const ExcelJS = require("exceljs");

let PDFDocument = null;
try {
  PDFDocument = require("pdfkit");
} catch (error) {
  console.error("Failed to load pdfkit:", error.message);
}

class ReportController {
  constructor() {
    this.getFinancialSummary = this.getFinancialSummary.bind(this);
    this.getMonthlyReport = this.getMonthlyReport.bind(this);
    this.generateReports = this.generateReports.bind(this);
  }

  // Helper function to identify numerical columns for a report
  getNumericalColumns(reportType, headers) {
    const numericalColumnMap = {
      member_financial_summary: [
        "Total Contributions",
        "Total Loans",
        "Total Loan Repaid",
        "Total Interest Charged",
        "Total Interest Paid",
        "Total Commodity Repaid",
        "Savings Balance",
        "Shares Balance",
      ],
      loan_performance: ["Loan Amount", "Total Repaid"],
      fee_collection: ["Amount"],
      savings_shares_growth: ["Savings", "Shares"],
      commodity_transactions: ["Amount", "Total Repaid"],
      overdue_loans: ["Loan Amount", "Outstanding Balance"],
      interest_summary: ["Interest Charged", "Interest Paid"],
      loan_repayment_summary: [
        "Total Amount",
        "Principal Amount",
        "Interest Amount",
      ],
      custom_spreadsheet_report: [
        "Shares Amount",
        "Savings Amount",
        "Loan",
        "Loan Repayment",
        "Interest Charged",
        "Interest Paid",
        "Commodity Amount",
        "Commodity Repayment",
        "Dev Levy",
        "Stationery",
        "Entry Fees",
        "Total",
      ],
    };

    return headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => numericalColumnMap[reportType]?.includes(header))
      .map(({ index }) => index);
  }

  // Helper function to compute footer sums
  computeFooter(reportType, headers, rows) {
    const numericalIndices = this.getNumericalColumns(reportType, headers);
    const footer = new Array(headers.length).fill("");
    footer[0] = "Total";

    numericalIndices.forEach((index) => {
      const sum = rows.reduce((acc, row) => {
        const value = parseFloat(row[index]?.replace(/[^0-9.-]+/g, "") || 0);
        return acc + (isNaN(value) ? 0 : value);
      }, 0);
      footer[index] =
        reportType === "member_financial_summary" ||
        reportType === "loan_performance"
          ? sum.toLocaleString("en-NG", { style: "currency", currency: "NGN" })
          : sum.toFixed(2);
    });

    return footer;
  }

  async getFinancialSummary(req, res) {
    const connection = await pool.getConnection();
    try {
      // Contributions
      const [contributionSummary] = await connection.execute(`
        SELECT 
          COALESCE(SUM(shares + savings), 0) AS total_contributions,
          COALESCE(SUM(shares), 0) AS total_shares,
          COALESCE(SUM(savings), 0) AS total_savings,
          COUNT(*) AS contribution_count
        FROM member_balances
      `);

      // Loans
      const [loanSummary] = await connection.execute(`
        SELECT 
          COUNT(*) AS total_loans,
          COALESCE(SUM(amount), 0) AS total_loan_amount,
          COALESCE(SUM(
            CASE 
              WHEN status = 'Active' 
              THEN amount - COALESCE((
                SELECT SUM(amount) 
                FROM loan_repayments lr 
                WHERE lr.loan_id = loans.id
              ), 0)
              ELSE 0 
            END
          ), 0) AS active_balance,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) AS active_loans,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) AS pending_loans,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) AS completed_loans
        FROM loans
      `);

      // Interest
      const [interestSummary] = await connection.execute(`
        SELECT 
          COALESCE(SUM(ic.amount), 0) AS total_interest_charged,
          COALESCE(SUM(ip.amount), 0) AS total_interest_paid,
          COALESCE(SUM(ic.amount - COALESCE(ip.amount, 0)), 0) AS total_interest_unpaid
        FROM interest_charged ic
        LEFT JOIN interest_paid ip 
          ON ic.member_id = ip.member_id 
          AND ic.period_id = ip.period_id
      `);

      // Commodity Repayments
      const [commodityRepaySummary] = await connection.execute(`
        SELECT 
          COALESCE(SUM(amount), 0) AS total_commodity_repaid,
          COUNT(*) AS commodity_repayment_count
        FROM commodity_repayments
      `);

      // Loan Repayments
      const [loanRepaySummary] = await connection.execute(`
        SELECT 
          COALESCE(SUM(amount), 0) AS total_loan_repaid,
          COALESCE(SUM(principal_amount), 0) AS total_principal_repaid,
          COALESCE(SUM(interest_amount), 0) AS total_interest_repaid,
          COUNT(*) AS loan_repayment_count
        FROM loan_repayments
      `);

      // Member Statistics
      const [memberStats] = await connection.execute(`
        SELECT 
          COUNT(*) AS total_members,
          COUNT(CASE WHEN membership_status = 'active' THEN 1 END) AS active_members
        FROM members
      `);

      const [genderStats] = await connection.execute(`
        SELECT 
          gender,
          COUNT(*) AS count
        FROM members
        GROUP BY gender
      `);

      const [statusStats] = await connection.execute(`
        SELECT 
          membership_status,
          COUNT(*) AS count
        FROM members
        GROUP BY membership_status
      `);

      // Repayment Trends (last 12 months based on periods)
      const [repayTrend] = await connection.execute(`
        WITH LoanRepayments AS (
  SELECT period_id, SUM(amount) AS total_loan_repaid
  FROM loan_repayments
  GROUP BY period_id
),
InterestCharged AS (
  SELECT period_id, SUM(amount) AS total_interest_charged
  FROM interest_charged
  GROUP BY period_id
),
InterestPaid AS (
  SELECT period_id, SUM(amount) AS total_interest_repaid
  FROM interest_paid
  GROUP BY period_id
)
SELECT 
  CONCAT(
    SUBSTRING(p.name, LOCATE(' ', p.name) + 1),
    '-',
    LPAD(
      CASE LOWER(LEFT(p.name, LOCATE(' ', p.name) - 1))
        WHEN 'january' THEN 1
        WHEN 'february' THEN 2
        WHEN 'march' THEN 3
        WHEN 'april' THEN 4
        WHEN 'may' THEN 5
        WHEN 'june' THEN 6
        WHEN 'july' THEN 7
        WHEN 'august' THEN 8
        WHEN 'september' THEN 9
        WHEN 'october' THEN 10
        WHEN 'november' THEN 11
        WHEN 'december' THEN 12
        ELSE 0
      END, 2, '0'
    )
  ) AS month,
  COALESCE(SUM(lr.total_loan_repaid), 0) AS total_loan_repaid,
  COALESCE(SUM(ip.total_interest_repaid), 0) AS total_interest_repaid,
  COALESCE(SUM(ic.total_interest_charged) - COALESCE(SUM(ip.total_interest_repaid), 0), 0) AS total_interest_unpaid
FROM periods p
LEFT JOIN LoanRepayments lr ON lr.period_id = p.id
LEFT JOIN InterestCharged ic ON ic.period_id = p.id
LEFT JOIN InterestPaid ip ON ip.period_id = p.id
WHERE p.name REGEXP '^[A-Za-z]+ [0-9]{4}$'
  AND CONCAT(
    SUBSTRING(p.name, LOCATE(' ', p.name) + 1),
    '-',
    LPAD(
      CASE LOWER(LEFT(p.name, LOCATE(' ', p.name) - 1))
        WHEN 'january' THEN 1
        WHEN 'february' THEN 2
        WHEN 'march' THEN 3
        WHEN 'april' THEN 4
        WHEN 'may' THEN 5
        WHEN 'june' THEN 6
        WHEN 'july' THEN 7
        WHEN 'august' THEN 8
        WHEN 'september' THEN 9
        WHEN 'october' THEN 10
        WHEN 'november' THEN 11
        WHEN 'december' THEN 12
        ELSE 0
      END, 2, '0'
    )
  ) >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 12 MONTH), '%Y-%m')
  AND CONCAT(
    SUBSTRING(p.name, LOCATE(' ', p.name) + 1),
    '-',
    LPAD(
      CASE LOWER(LEFT(p.name, LOCATE(' ', p.name) - 1))
        WHEN 'january' THEN 1
        WHEN 'february' THEN 2
        WHEN 'march' THEN 3
        WHEN 'april' THEN 4
        WHEN 'may' THEN 5
        WHEN 'june' THEN 6
        WHEN 'july' THEN 7
        WHEN 'august' THEN 8
        WHEN 'september' THEN 9
        WHEN 'october' THEN 10
        WHEN 'november' THEN 11
        WHEN 'december' THEN 12
        ELSE 0
      END, 2, '0'
    )
  ) <= DATE_FORMAT(CURDATE(), '%Y-%m')
GROUP BY CONCAT(
  SUBSTRING(p.name, LOCATE(' ', p.name) + 1),
  '-',
  LPAD(
    CASE LOWER(LEFT(p.name, LOCATE(' ', p.name) - 1))
      WHEN 'january' THEN 1
      WHEN 'february' THEN 2
      WHEN 'march' THEN 3
      WHEN 'april' THEN 4
      WHEN 'may' THEN 5
      WHEN 'june' THEN 6
      WHEN 'july' THEN 7
      WHEN 'august' THEN 8
      WHEN 'september' THEN 9
      WHEN 'october' THEN 10
      WHEN 'november' THEN 11
      WHEN 'december' THEN 12
      ELSE 0
    END, 2, '0'
  )
)
HAVING month != '0000-00'
ORDER BY month ASC
      `);

      const [interestUnpaidTrend] = await connection.execute(`
        SELECT 
          DATE_FORMAT(STR_TO_DATE(p.name, '%M %Y'), '%Y-%m') AS month,
          COALESCE(SUM(ic.amount - COALESCE(ip.amount, 0)), 0) AS total_unpaid
        FROM interest_charged ic
        LEFT JOIN interest_paid ip 
          ON ic.member_id = ip.member_id 
          AND ic.period_id = ip.period_id
        JOIN periods p ON ic.period_id = p.id
        WHERE STR_TO_DATE(p.name, '%M %Y') >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          AND STR_TO_DATE(p.name, '%M %Y') <= CURDATE()
        GROUP BY month
        ORDER BY month ASC
      `);

      // Merge repayment trends
      const repaymentTrends = {};
      repayTrend.forEach((row) => {
        repaymentTrends[row.month] = {
          total_loan_repaid: parseFloat(row.total_loan_repaid || 0),
          total_interest_repaid: parseFloat(row.total_interest_repaid || 0),
          total_interest_unpaid: parseFloat(row.total_interest_unpaid || 0),
        };
      });

      interestUnpaidTrend.forEach((row) => {
        if (!repaymentTrends[row.month]) {
          repaymentTrends[row.month] = {
            total_loan_repaid: 0,
            total_interest_repaid: 0,
            total_interest_unpaid: parseFloat(row.total_unpaid || 0),
          };
        } else {
          repaymentTrends[row.month].total_interest_unpaid = parseFloat(
            row.total_unpaid || 0
          );
        }
      });

      // Build response
      const response = {
        contributions: {
          total_contributions: parseFloat(
            contributionSummary[0].total_contributions || 0
          ),
          total_shares: parseFloat(contributionSummary[0].total_shares || 0),
          total_savings: parseFloat(contributionSummary[0].total_savings || 0),
          contribution_count: parseInt(
            contributionSummary[0].contribution_count || 0
          ),
        },
        loans: {
          total_loans: parseInt(loanSummary[0].total_loans || 0),
          total_loan_amount: parseFloat(loanSummary[0].total_loan_amount || 0),
          active_balance: parseFloat(loanSummary[0].active_balance || 0),
          active_loans: parseInt(loanSummary[0].active_loans || 0),
          pending_loans: parseInt(loanSummary[0].pending_loans || 0),
          completed_loans: parseInt(loanSummary[0].completed_loans || 0),
        },
        interest: {
          total_interest_charged: parseFloat(
            interestSummary[0].total_interest_charged || 0
          ),
          total_interest_paid: parseFloat(
            interestSummary[0].total_interest_paid || 0
          ),
          total_interest_unpaid: parseFloat(
            interestSummary[0].total_interest_unpaid || 0
          ),
        },
        repayments: {
          total_loan_repaid: parseFloat(
            loanRepaySummary[0].total_loan_repaid || 0
          ),
          total_principal_repaid: parseFloat(
            loanRepaySummary[0].total_principal_repaid || 0
          ),
          total_interest_repaid: parseFloat(
            loanRepaySummary[0].total_interest_repaid || 0
          ),
          loan_repayment_count: parseInt(
            loanRepaySummary[0].loan_repayment_count || 0
          ),
          total_commodity_repaid: parseFloat(
            commodityRepaySummary[0].total_commodity_repaid || 0
          ),
          commodity_repayment_count: parseInt(
            commodityRepaySummary[0].commodity_repayment_count || 0
          ),
        },
        members: {
          total_members: parseInt(memberStats[0].total_members || 0),
          active_members: parseInt(memberStats[0].active_members || 0),
          gender: {
            male: parseInt(
              genderStats.find((g) => g.gender === "M")?.count || 0
            ),
            female: parseInt(
              genderStats.find((g) => g.gender === "F")?.count || 0
            ),
            other: parseInt(
              genderStats.find((g) => g.gender === "Other")?.count || 0
            ),
          },
          status: {
            active: parseInt(
              statusStats.find((s) => s.membership_status === "active")
                ?.count || 0
            ),
            inactive: parseInt(
              statusStats.find((s) => s.membership_status === "inactive")
                ?.count || 0
            ),
            suspended: parseInt(
              statusStats.find((s) => s.membership_status === "suspended")
                ?.count || 0
            ),
          },
        },
        repayment_trend: repaymentTrends,
        generatedAt: new Date().toISOString(),
      };

      ResponseHandler.success(res, response);
    } catch (error) {
      console.error("Financial summary error:", error);
      ResponseHandler.error(res, "Failed to generate financial summary", 500);
    } finally {
      connection.release();
    }
  }

  async getMonthlyReport(req, res) {
    const connection = await pool.getConnection();
    try {
      const { year, month } = req.query;
      if (!year || !month) {
        return ResponseHandler.error(res, "Year and month are required", 400);
      }

      const [contributions] = await connection.execute(
        `SELECT 
            c.*,
            m.member_id as member_number,
            m.first_name,
            m.last_name
        FROM contributions c
        JOIN members m ON c.member_id = m.id
        JOIN periods p ON c.period_id = p.id
        WHERE YEAR(c.created_at) = ? AND MONTH(c.created_at) = ?
        ORDER BY c.created_at`,
        [year, month]
      );

      const [loanRepayments] = await connection.execute(
        `SELECT 
            lr.*,
            m.member_id as member_number,
            m.first_name,
            m.last_name
        FROM loan_repayments lr
        JOIN members m ON lr.member_id = m.id
        JOIN periods p ON lr.period_id = p.id
        WHERE YEAR(lr.payment_date) = ? AND MONTH(lr.payment_date) = ?
        ORDER BY lr.payment_date`,
        [year, month]
      );

      const [interestPayments] = await connection.execute(
        `SELECT 
            ip.*,
            m.member_id as member_number,
            m.first_name,
            m.last_name
        FROM interest_paid ip
        JOIN members m ON ip.member_id = m.id
        JOIN periods p ON ip.period_id = p.id
        WHERE YEAR(ip.payment_date) = ? AND MONTH(ip.payment_date) = ?
        ORDER BY ip.payment_date`,
        [year, month]
      );

      const [commodityRepayments] = await connection.execute(
        `SELECT 
            cr.*,
            m.member_id as member_number,
            m.first_name,
            m.last_name
        FROM commodity_repayments cr
        JOIN members m ON cr.member_id = m.id
        JOIN periods p ON cr.period_id = p.id
        WHERE YEAR(cr.payment_date) = ? AND MONTH(cr.payment_date) = ?
        ORDER BY cr.payment_date`,
        [year, month]
      );

      const [interestCharged] = await connection.execute(
        `SELECT 
            ic.*,
            m.member_id as member_number,
            m.first_name,
            m.last_name
        FROM interest_charged ic
        JOIN members m ON ic.member_id = m.id
        JOIN periods p ON ic.period_id = p.id
        WHERE YEAR(ic.charged_date) = ? AND MONTH(ic.charged_date) = ?
        ORDER BY ic.charged_date`,
        [year, month]
      );

      ResponseHandler.success(res, {
        period: { year, month },
        contributions,
        loan_repayments: loanRepayments,
        interest_payments: interestPayments,
        commodity_repayments: commodityRepayments,
        interest_charged: interestCharged,
        generatedAt: new Date(),
      });
    } catch (error) {
      console.error("Monthly report error:", error);
      ResponseHandler.error(res, "Failed to generate monthly report");
    } finally {
      connection.release();
    }
  }

  async generateReports(req, res) {
    const connection = await pool.getConnection();
    try {
      console.log("Request Method:", req.method);
      console.log("Request Headers:", req.headers);
      console.log("Raw Request Body:", req.body);

      if (!req.body || Object.keys(req.body).length === 0) {
        console.log("Request body is undefined or empty");
        return ResponseHandler.error(res, "Request body is required", 400);
      }

      const report_type = req.body.report_type || "member_financial_summary";
      const period_from = req.body.period_from;
      const period_to = req.body.period_to;
      const member_id = req.body.member_id;
      const delete_transactions = req.body.delete_transactions || false;
      const selected_rows = req.body.selected_rows || [];
      const export_format = req.body.export_format;

      console.log("Extracted Values:", {
        report_type,
        period_from,
        period_to,
        member_id,
        delete_transactions,
        selected_rows,
        export_format,
      });

      if (!report_type) {
        console.log("Validation Failed: report_type is missing or undefined");
        return ResponseHandler.error(res, "Report type is required", 400);
      }

      if (!period_from || !period_to) {
        console.log("Validation Failed: period_from or period_to is missing");
        return ResponseHandler.error(
          res,
          "Period range (period_from and period_to) required",
          400
        );
      }

      const fromId = parseInt(period_from);
      const toId = parseInt(period_to);
      const searchMemberId = member_id ? parseInt(member_id) : null;

      if (isNaN(fromId) || isNaN(toId) || fromId > toId) {
        console.log("Validation Failed: Invalid period range");
        return ResponseHandler.error(res, "Invalid period range", 400);
      }

      const [periods] = await connection.query(
        "SELECT id, name FROM periods WHERE id BETWEEN ? AND ? ORDER BY id",
        [fromId, toId]
      );
      if (!periods.length) {
        return ResponseHandler.error(
          res,
          "No periods found for the given range",
          404
        );
      }

      let reportTable = { headers: [], rows: [] };
      let memberIds = [];
      let reportData = {};

      switch (report_type) {
        case "member_financial_summary": {
          let memberQuery = `
            SELECT m.id, m.member_id, m.first_name, m.last_name
            FROM members m
          `;
          let memberParams = [];
          if (searchMemberId) {
            memberQuery += " WHERE m.id = ?";
            memberParams.push(searchMemberId);
          }

          const [members] = await connection.query(memberQuery, memberParams);
          if (!members.length) {
            return ResponseHandler.error(res, "No members found", 404);
          }

          reportTable.headers = [
            "Member ID",
            "Name",
            "Total Contributions",
            "Total Loans",
            "Total Loan Repaid",
            "Loan Balance",
            "Total Interest Charged",
            "Total Interest Paid",
            "Unpaid Interest",
            "Total Commodity Repaid",
            "Savings Balance",
            "Shares Balance",
          ];

          for (const member of members) {
            const [contributions] = await connection.query(
              `
                SELECT COALESCE(SUM(amount), 0) as total_contributions
                FROM contributions
                WHERE member_id = ? AND period_id BETWEEN ? AND ?
              `,
              [member.id, fromId, toId]
            );

            const [loans] = await connection.query(
              `
                SELECT COALESCE(SUM(l.amount), 0) as total_loans,
                       COALESCE(SUM(ic.amount), 0) as total_interest_charged
                FROM loans l
                LEFT JOIN interest_charged ic ON ic.member_id = l.member_id AND ic.period_id = l.period_id
                WHERE l.member_id = ? AND l.period_id BETWEEN ? AND ?
              `,
              [member.id, fromId, toId]
            );

            const [repayments] = await connection.query(
              `
                SELECT COALESCE(SUM(amount), 0) as total_loan_repaid
                FROM loan_repayments
                WHERE member_id = ? AND period_id BETWEEN ? AND ?
              `,
              [member.id, fromId, toId]
            );

            const [interestpaid] = await connection.query(
              `
                SELECT COALESCE(SUM(amount), 0) as total_interest_paid
                FROM interest_paid WHERE member_id = ? AND period_id BETWEEN ? AND ?
              `,
              [member.id, fromId, toId]
            );

            const [commodityRepayments] = await connection.query(
              `
                SELECT COALESCE(SUM(amount), 0) as total_commodity_repaid
                FROM commodity_repayments
                WHERE member_id = ? AND period_id BETWEEN ? AND ?
              `,
              [member.id, fromId, toId]
            );

            const [balances] = await connection.query(
              `
                SELECT COALESCE(SUM(savings), 0) as savings,
                       COALESCE(SUM(shares), 0) as shares
                FROM member_balances
                WHERE member_id = ? AND period_id BETWEEN ? AND ?
              `,
              [member.id, fromId, toId]
            );

            console.log(`Fetched data for member ${member.id}:`, {
              contributions,
              loans,
              repayments,
              interestpaid,
              commodityRepayments,
              balances,
            });

            const row = [
              member.member_id,
              `${member.first_name} ${member.last_name}`,
              parseFloat(
                contributions[0].total_contributions || 0
              ).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              }),
              parseFloat(loans[0].total_loans || 0).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              }),
              parseFloat(repayments[0].total_loan_repaid || 0).toLocaleString(
                "en-NG",
                {
                  style: "currency",
                  currency: "NGN",
                }
              ),
              parseFloat(
                loans[0].total_loans - repayments[0].total_loan_repaid || 0
              ).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              }),
              parseFloat(loans[0].total_interest_charged || 0).toLocaleString(
                "en-NG",
                {
                  style: "currency",
                  currency: "NGN",
                }
              ),
              parseFloat(
                interestpaid[0].total_interest_paid || 0
              ).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              }),
              parseFloat(
                loans[0].total_interest_charged -
                  interestpaid[0].total_interest_paid || 0
              ).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              }),
              parseFloat(
                commodityRepayments[0].total_commodity_repaid || 0
              ).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              }),
              parseFloat(balances[0].savings || 0).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              }),
              parseFloat(balances[0].shares || 0).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              }),
            ];

            reportTable.rows.push(row);
            memberIds.push(member.id);
          }

          reportTable.footer = this.computeFooter(
            report_type,
            reportTable.headers,
            reportTable.rows
          );

          reportData = {
            reportTable,
            member_ids: memberIds,
            message: delete_transactions
              ? "Transactions deleted and report generated successfully"
              : "Report generated successfully",
          };
          break;
        }

        case "loan_performance": {
          const [loans] = await connection.query(
            `
              SELECT m.member_id, m.first_name, m.last_name, l.id as loan_id, l.amount,
                     l.interest_rate, l.term, l.status,
                     COALESCE(SUM(lr.amount), 0) as total_repaid,
                     (l.amount - COALESCE(SUM(lr.amount), 0)) as remaining_balance
              FROM loans l
              JOIN members m ON m.id = l.member_id
              LEFT JOIN loan_repayments lr ON lr.loan_id = l.id
              WHERE l.period_id BETWEEN ? AND ?
              ${searchMemberId ? "AND l.member_id = ?" : ""}
              GROUP BY l.id, m.member_id, m.first_name, m.last_name
            `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          reportTable.headers = [
            "S/N",
            "Coop Member No",
            "Name",
            "Loan ID",
            "Loan Amount",
            "Interest Rate",
            "Term (Months)",
            "Status",
            "Total Repaid",
            "Remaining Balance",
          ];

          reportTable.rows = loans.map((loan, index) => [
            index + 1,
            loan.member_id || "N/A",
            `${loan.first_name || "N/A"} ${loan.last_name || "N/A"}`,
            loan.loan_id || "N/A",
            parseFloat(loan.amount || 0).toLocaleString("en-NG", {
              style: "currency",
              currency: "NGN",
            }),
            (parseFloat(loan.interest_rate || 0) * 100).toFixed(2) + "%",
            loan.term || "N/A",
            loan.status || "N/A",
            parseFloat(loan.total_repaid || 0).toLocaleString("en-NG", {
              style: "currency",
              currency: "NGN",
            }),
            parseFloat(loan.remaining_balance || 0).toLocaleString("en-NG", {
              style: "currency",
              currency: "NGN",
            }),
          ]);

          reportTable.footer = this.computeFooter(
            report_type,
            reportTable.headers,
            reportTable.rows
          );

          reportData = {
            loans: loans.map((loan) => ({
              member_id: loan.member_id,
              first_name: loan.first_name,
              last_name: loan.last_name,
              loan_id: loan.loan_id,
              amount: parseFloat(loan.amount || 0).toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              }),
              interest_rate: loan.interest_rate,
              term: loan.term,
              status: loan.status,
              total_repaid: parseFloat(loan.total_repaid || 0).toLocaleString(
                "en-NG",
                { style: "currency", currency: "NGN" }
              ),
              remaining_balance: parseFloat(
                loan.remaining_balance || 0
              ).toLocaleString("en-NG", { style: "currency", currency: "NGN" }),
            })),
            reportTable,
            message: "Loan performance report generated successfully",
          };
          break;
        }

        case "fee_collection": {
          const [rows] = await connection.query(
            `
              SELECT 
                m.id AS member_id_num,
                m.member_id,
                m.first_name,
                m.last_name,
                p.id AS period_id,
                p.name AS period_name,
                'Development Levy' AS fee_type,
                dlf.amount,
                dlf.created_at
              FROM development_levy_fees dlf
              JOIN members m ON m.id = dlf.member_id
              JOIN periods p ON p.id = dlf.period_id
              WHERE dlf.period_id BETWEEN ? AND ?
              ${searchMemberId ? "AND dlf.member_id = ?" : ""}
              UNION ALL
              SELECT 
                m.id AS member_id_num,
                m.member_id,
                m.first_name,
                m.last_name,
                p.id AS period_id,
                p.name AS period_name,
                'Entry Fee' AS fee_type,
                ef.amount,
                ef.created_at
              FROM entry_fees ef
              JOIN members m ON m.id = ef.member_id
              JOIN periods p ON p.id = ef.period_id
              WHERE ef.period_id BETWEEN ? AND ?
              ${searchMemberId ? "AND ef.member_id = ?" : ""}
              UNION ALL
              SELECT 
                m.id AS member_id_num,
                m.member_id,
                m.first_name,
                m.last_name,
                p.id AS period_id,
                p.name AS period_name,
                'Stationery Fee' AS fee_type,
                sf.amount,
                sf.created_at
              FROM stationery_fees sf
              JOIN members m ON m.id = sf.member_id
              JOIN periods p ON p.id = sf.period_id
              WHERE sf.period_id BETWEEN ? AND ?
              ${searchMemberId ? "AND sf.member_id = ?" : ""}
              ORDER BY member_id, period_id, fee_type
            `,
            searchMemberId
              ? [
                  fromId,
                  toId,
                  searchMemberId,
                  fromId,
                  toId,
                  searchMemberId,
                  fromId,
                  toId,
                  searchMemberId,
                ]
              : [fromId, toId, fromId, toId, fromId, toId]
          );

          if (!rows.length) {
            return ResponseHandler.error(
              res,
              "No fee data found for the specified criteria",
              404
            );
          }

          reportTable.headers = [
            "S/N",
            "Coop Member No",
            "Name",
            "Period",
            "Fee Type",
            "Amount",
          ];

          reportTable.rows = rows.map((row, index) => [
            index + 1,
            row.member_id || "N/A",
            `${row.first_name || "N/A"} ${row.last_name || "N/A"}`,
            row.period_name || "N/A",
            row.fee_type || "N/A",
            parseFloat(row.amount || 0).toFixed(2),
          ]);

          reportTable.footer = this.computeFooter(
            report_type,
            reportTable.headers,
            reportTable.rows
          );

          reportData = {
            fees: rows.map((row) => ({
              member_id: row.member_id || "N/A",
              first_name: row.first_name || "N/A",
              last_name: row.last_name || "N/A",
              fee_type: row.fee_type || "N/A",
              amount: parseFloat(row.amount || 0).toFixed(2),
              period_name: row.period_name || "N/A",
              created_at: row.created_at || null,
            })),
            reportTable,
            member_ids: rows.map((row) => row.member_id_num || "N/A"),
            period_ids: rows.map((row) => row.period_id || "N/A"),
            message: "Fee collection report generated successfully",
          };
          break;
        }

        case "savings_shares_growth": {
          const [balances] = await connection.query(
            `
              SELECT m.member_id,
                     m.first_name,
                     m.last_name,
                     p.name AS period_name,
                     mb.savings,
                     mb.shares,
                     SUM(mb.savings) OVER (
                       PARTITION BY mb.member_id
                       ORDER BY mb.period_id
                     ) AS running_savings,
                     SUM(mb.shares) OVER (
                       PARTITION BY mb.member_id
                       ORDER BY mb.period_id
                     ) AS running_shares
              FROM member_balances mb
              JOIN members m ON m.id = mb.member_id
              JOIN periods p ON p.id = mb.period_id
              WHERE mb.period_id BETWEEN ? AND ?
              ${searchMemberId ? "AND m.id = ?" : ""}
              ORDER BY m.id, p.id
            `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          reportTable.headers = [
            "S/N",
            "Coop Member No",
            "Name",
            "Period",
            "Savings",
            "Running Savings",
            "Shares",
            "Running Shares",
          ];

          reportTable.rows = balances.map((balance, index) => [
            index + 1,
            balance.member_id || "N/A",
            `${balance.first_name || "N/A"} ${balance.last_name || "N/A"}`,
            balance.period_name || "N/A",
            parseFloat(balance.savings || 0).toFixed(2),
            parseFloat(balance.running_savings || 0).toFixed(2),
            parseFloat(balance.shares || 0).toFixed(2),
            parseFloat(balance.running_shares || 0).toFixed(2),
          ]);

          reportTable.footer = this.computeFooter(
            report_type,
            reportTable.headers,
            reportTable.rows
          );

          reportData = {
            balances: balances.map((balance) => ({
              member_id: balance.member_id,
              first_name: balance.first_name,
              last_name: balance.last_name,
              period_name: balance.period_name,
              savings: parseFloat(balance.savings || 0).toFixed(2),
              running_savings: parseFloat(balance.running_savings || 0).toFixed(
                2
              ),
              shares: parseFloat(balance.shares || 0).toFixed(2),
              running_shares: parseFloat(balance.running_shares || 0).toFixed(
                2
              ),
            })),
            reportTable,
            message:
              "Savings and shares growth report with running balances generated successfully",
          };
          break;
        }

        case "commodity_transactions": {
          const [commodities] = await connection.query(
            `
              SELECT m.member_id, m.first_name, m.last_name, c.name, c.amount,
                     COALESCE(SUM(cr.amount), 0) as total_repaid,
                     p.name as period_name
              FROM commodities c
              JOIN members m ON m.id = c.member_id
              JOIN periods p ON p.id = c.period_id
              LEFT JOIN commodity_repayments cr ON cr.commodity_id = c.id
              WHERE c.period_id BETWEEN ? AND ?
              ${searchMemberId ? "AND c.member_id = ?" : ""}
              GROUP BY c.id, m.member_id, m.first_name, m.last_name, c.name, c.amount, p.name
            `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          reportTable.headers = [
            "S/N",
            "Coop Member No",
            "Name",
            "Commodity Name",
            "Amount",
            "Total Repaid",
            "Remaining Balance",
            "Period",
          ];

          reportTable.rows = commodities.map((commodity, index) => [
            index + 1,
            commodity.member_id || "N/A",
            `${commodity.first_name || "N/A"} ${commodity.last_name || "N/A"}`,
            commodity.name || "N/A",
            parseFloat(commodity.amount || 0).toFixed(2),
            parseFloat(commodity.total_repaid || 0).toFixed(2),
            (
              parseFloat(commodity.amount || 0) -
              parseFloat(commodity.total_repaid || 0)
            ).toFixed(2),
            commodity.period_name || "N/A",
          ]);

          reportTable.footer = this.computeFooter(
            report_type,
            reportTable.headers,
            reportTable.rows
          );

          reportData = {
            commodities: commodities.map((commodity) => ({
              member_id: commodity.member_id,
              first_name: commodity.first_name,
              last_name: commodity.last_name,
              name: commodity.name,
              amount: commodity.amount,
              total_repaid: commodity.total_repaid,
              period_name: commodity.period_name,
            })),
            reportTable,
            message: "Commodity transactions report generated successfully",
          };
          break;
        }

        case "overdue_loans": {
          const [loans] = await connection.query(
            `
              SELECT m.member_id, m.first_name, m.last_name, l.id as loan_id, l.amount,
                     l.due_date,
                     DATEDIFF(CURDATE(), l.due_date) as days_overdue,
                     (l.amount - COALESCE(SUM(lr.amount), 0)) as outstanding_balance
              FROM loans l
              JOIN members m ON m.id = l.member_id
              LEFT JOIN loan_repayments lr ON lr.loan_id = l.id
              WHERE l.period_id BETWEEN ? AND ?
              AND l.due_date < CURDATE()
              AND (l.amount - COALESCE(SUM(lr.amount), 0)) > 0
              ${searchMemberId ? "AND l.member_id = ?" : ""}
              GROUP BY l.id, m.member_id, m.first_name, m.last_name
            `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          reportTable.headers = [
            "S/N",
            "Coop Member No",
            "Name",
            "Loan ID",
            "Loan Amount",
            "Due Date",
            "Days Overdue",
            "Outstanding Balance",
          ];

          reportTable.rows = loans.map((loan, index) => [
            index + 1,
            loan.member_id || "N/A",
            `${loan.first_name || "N/A"} ${loan.last_name || "N/A"}`,
            loan.loan_id || "N/A",
            parseFloat(loan.amount || 0).toFixed(2),
            new Date(loan.due_date).toLocaleDateString(),
            loan.days_overdue || 0,
            parseFloat(loan.outstanding_balance || 0).toFixed(2),
          ]);

          reportTable.footer = this.computeFooter(
            report_type,
            reportTable.headers,
            reportTable.rows
          );

          reportData = {
            loans: loans.map((loan) => ({
              member_id: loan.member_id,
              first_name: loan.first_name,
              last_name: loan.last_name,
              loan_id: loan.loan_id,
              amount: loan.amount,
              due_date: loan.due_date,
              days_overdue: loan.days_overdue,
              outstanding_balance: loan.outstanding_balance,
            })),
            reportTable,
            message: "Overdue loans report generated successfully",
          };
          break;
        }

        case "interest_summary": {
          const [rows] = await connection.query(
            `
              SELECT 
                m.member_id,
                m.first_name,
                m.last_name,
                p.id AS period_id,
                p.name AS period_name,
                COALESCE(ic.amount, 0) AS interest_charged,
                COALESCE(ip.amount, 0) AS interest_paid,
                COALESCE(SUM(ic.amount - COALESCE(ip.amount, 0)) OVER (
                  PARTITION BY m.id 
                  ORDER BY p.id
                ), 0) AS unpaid_interest
              FROM members m
              CROSS JOIN periods p
              LEFT JOIN interest_charged ic ON m.id = ic.member_id AND p.id = ic.period_id
              LEFT JOIN interest_paid ip ON m.id = ip.member_id AND p.id = ip.period_id
              WHERE p.id BETWEEN ? AND ?
              ${searchMemberId ? "AND m.id = ?" : ""}
              ORDER BY m.id, p.id
            `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          if (!rows.length) {
            return ResponseHandler.error(
              res,
              "No interest data found for the specified criteria",
              404
            );
          }

          const totals = rows.reduce(
            (acc, row) => ({
              total_interest_charged:
                acc.total_interest_charged +
                parseFloat(row.interest_charged || 0),
              total_interest_paid:
                acc.total_interest_paid + parseFloat(row.interest_paid || 0),
            }),
            { total_interest_charged: 0, total_interest_paid: 0 }
          );

          reportTable.headers = [
            "S/N",
            "Coop Member No",
            "Name",
            "Period",
            "Interest Charged",
            "Interest Paid",
            "Unpaid Interest",
          ];

          reportTable.rows = rows.map((row, index) => [
            index + 1,
            row.member_id || "N/A",
            `${row.first_name || "N/A"} ${row.last_name || "N/A"}`,
            row.period_name || "N/A",
            parseFloat(row.interest_charged || 0).toFixed(2),
            parseFloat(row.interest_paid || 0).toFixed(2),
            parseFloat(row.unpaid_interest || 0).toFixed(2),
          ]);

          reportTable.footer = this.computeFooter(
            report_type,
            reportTable.headers,
            reportTable.rows
          );

          reportData = {
            interest: {
              total_interest_charged: totals.total_interest_charged.toFixed(2),
              total_interest_paid: totals.total_interest_paid.toFixed(2),
              total_unpaid_interest: (
                totals.total_interest_charged - totals.total_interest_paid
              ).toFixed(2),
            },
            reportTable,
            member_ids: rows.map((row) => row.member_id || "N/A"),
            period_ids: rows.map((row) => row.period_id || "N/A"),
            message: "Interest summary report generated successfully",
          };
          break;
        }

        case "loan_repayment_summary": {
          const [rows] = await connection.query(
            `
              SELECT 
                m.id AS member_id_num,
                m.member_id,
                m.first_name,
                m.last_name,
                p.id AS period_id,
                p.name AS period_name,
                COALESCE(lr.amount, 0) AS principal_amount,
                COALESCE(ip.amount, 0) AS interest_amount,
                COALESCE(lr.amount, 0) AS total_amount,
                COALESCE(lr.status, 'N/A') AS status
              FROM members m
              CROSS JOIN periods p
              LEFT JOIN loan_repayments lr ON m.id = lr.member_id AND p.id = lr.period_id
              LEFT JOIN interest_paid ip ON m.id = ip.member_id AND p.id = ip.period_id
              WHERE p.id BETWEEN ? AND ?
              ${searchMemberId ? "AND m.id = ?" : ""}
              AND (lr.amount IS NOT NULL OR ip.amount IS NOT NULL)
              ORDER BY m.id, p.id
            `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          if (!rows.length) {
            return ResponseHandler.error(
              res,
              "No repayment data found for the specified criteria",
              404
            );
          }

          reportTable.headers = [
            "S/N",
            "Coop Member No",
            "Name",
            "Period",
            "Total Amount",
            "Principal Amount",
            "Interest Amount",
            "Status",
          ];

          reportTable.rows = rows.map((row, index) => [
            index + 1,
            row.member_id || "N/A",
            `${row.first_name || "N/A"} ${row.last_name || "N/A"}`,
            row.period_name || "N/A",
            parseFloat(row.total_amount || 0).toFixed(2),
            parseFloat(row.principal_amount || 0).toFixed(2),
            parseFloat(row.interest_amount || 0).toFixed(2),
            row.status,
          ]);

          reportTable.footer = this.computeFooter(
            report_type,
            reportTable.headers,
            reportTable.rows
          );

          reportData = {
            loan_repayments: rows.map((row) => ({
              member_number: row.member_id || "N/A",
              first_name: row.first_name || "N/A",
              last_name: row.last_name || "N/A",
              period_name: row.period_name || "N/A",
              total_amount: parseFloat(row.total_amount || 0).toFixed(2),
              principal_amount: parseFloat(row.principal_amount || 0).toFixed(
                2
              ),
              interest_amount: parseFloat(row.interest_amount || 0).toFixed(2),
              status: row.status,
            })),
            reportTable,
            member_ids: rows.map((row) => row.member_id_num || "N/A"),
            period_ids: rows.map((row) => row.period_id || "N/A"),
            message: "Loan repayment summary report generated successfully",
          };
          break;
        }

        case "custom_spreadsheet_report": {
          if (
            delete_transactions &&
            selected_rows &&
            selected_rows.length > 0
          ) {
            await connection.beginTransaction();
            try {
              for (const row of selected_rows) {
                const memberId = parseInt(row.member_id);
                const periodId = parseInt(row.period_id);
                if (isNaN(memberId) || isNaN(periodId)) {
                  throw new Error(
                    "Invalid member_id or period_id in selected_rows"
                  );
                }

                console.log(
                  `Deleting transactions for member ${memberId}, period ${periodId}`
                );

                await connection.query(
                  `DELETE FROM loan_repayments WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );
                await connection.query(
                  `DELETE FROM interest_charged WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );

                const [loanCheck] = await connection.query(
                  `SELECT id, status FROM loans WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );

                if (loanCheck.length > 0) {
                  // Iterate over all loans and update status to 'pending' if not already pending
                  for (const loan of loanCheck) {
                    if (loan.status !== "pending") {
                      await connection.query(
                        `UPDATE loans SET status = 'pending' WHERE id = ?`,
                        [loan.id]
                      );
                    }
                  }
                }
                await connection.query(
                  `DELETE FROM interest_paid WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );
                await connection.query(
                  `DELETE FROM commodity_repayments WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );
                await connection.query(
                  `DELETE FROM development_levy_fees WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );
                await connection.query(
                  `DELETE FROM member_levy_debt WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );
                await connection.query(
                  `DELETE FROM stationery_fees WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );
                const [result] = await connection.query(
                  `DELETE FROM entry_fees WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );

                if (result.affectedRows > 0) {
                  await connection.query(
                    `UPDATE members SET entry_fee_paid = 0 WHERE id = ?`,
                    [memberId]
                  );
                }
                await connection.query(
                  `DELETE FROM mastertransact WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );
                await connection.query(
                  `DELETE FROM member_balances WHERE member_id = ? AND period_id = ?`,
                  [memberId, periodId]
                );

                console.log(
                  `Deleted transactions for member ${memberId} in period ${periodId}`
                );
              }
              await connection.commit();
            } catch (error) {
              await connection.rollback();
              console.error("Deletion error:", error);
              return ResponseHandler.error(
                res,
                `Failed to delete transactions: ${error.message}`,
                500
              );
            }
          }

          reportTable.headers = [
            "S/N",
            "Coop Member No",
            "Name",
            "Period",
            "Shares Amount",
            "Shares Balance",
            "Savings Amount",
            "Savings Balance",
            "Loan",
            "Loan Repayment",
            "Loan Balance",
            "Interest Charged",
            "Interest Paid",
            "Unpaid Interest",
            "Commodity Amount",
            "Commodity Repayment",
            "Commodity Balance",
            "D.L. /B.L.",
            "Stationery",
            "Entry Fees",
            "Withdrawal",
            "Total",
          ];

          const periodRange = searchMemberId
            ? [fromId, toId, searchMemberId]
            : [fromId, toId];

          // 1. Get all unique member IDs in the report
          let memberIds = [];
          if (searchMemberId) {
            memberIds = [searchMemberId];
          } else {
            const [memberRows] = await connection.query(
              `SELECT DISTINCT m.id FROM members m CROSS JOIN periods p WHERE p.id BETWEEN ? AND ?`,
              [fromId, toId]
            );
            memberIds = memberRows.map((row) => row.id);
          }

          // 2. Get opening balances for each member before the first period (including withdrawals)
          const openingBalances = {};
          if (memberIds.length > 0) {
            const [openRows] = await connection.query(
              `SELECT
                m.id AS member_id_num,
                COALESCE(SUM(mb.shares), 0) AS opening_shares,
                COALESCE(SUM(mb.savings), 0) AS opening_savings,
                COALESCE(SUM(l.amount), 0) AS opening_loan_amount,
                COALESCE(SUM(lr.amount), 0) AS opening_loan_repayment,
                COALESCE(SUM(ic.amount), 0) AS opening_interest_charged,
                COALESCE(SUM(ip.amount), 0) AS opening_interest_paid,
                COALESCE(SUM(c.amount), 0) AS opening_commodity_amount,
                COALESCE(SUM(cr.amount), 0) AS opening_commodity_repayment,
                COALESCE(SUM(dlf.amount), 0) AS opening_dev_levy,
                COALESCE(SUM(sf.amount), 0) AS opening_stationery,
                COALESCE(SUM(ef.amount), 0) AS opening_entry_fees,
                COALESCE(SUM(w.amount), 0) AS opening_withdrawal
              FROM members m
              LEFT JOIN member_balances mb ON m.id = mb.member_id AND mb.period_id < ?
              LEFT JOIN loans l ON m.id = l.member_id AND l.period_id < ?
              LEFT JOIN loan_repayments lr ON m.id = lr.member_id AND lr.period_id < ?
              LEFT JOIN interest_charged ic ON m.id = ic.member_id AND ic.period_id < ?
              LEFT JOIN interest_paid ip ON m.id = ip.member_id AND ip.period_id < ?
              LEFT JOIN commodities c ON m.id = c.member_id AND c.period_id < ?
              LEFT JOIN commodity_repayments cr ON m.id = cr.member_id AND cr.period_id < ?
              LEFT JOIN development_levy_fees dlf ON m.id = dlf.member_id AND dlf.period_id < ?
              LEFT JOIN stationery_fees sf ON m.id = sf.member_id AND sf.period_id < ?
              LEFT JOIN entry_fees ef ON m.id = ef.member_id AND ef.period_id < ?
              LEFT JOIN withdrawals w ON m.id = w.member_id AND w.period_id < ?
              WHERE m.id IN (${memberIds.map(() => "?").join(",")})
              GROUP BY m.id`,
              [
                fromId,
                fromId,
                fromId,
                fromId,
                fromId,
                fromId,
                fromId,
                fromId,
                fromId,
                fromId,
                fromId,
                ...memberIds,
              ]
            );
            for (const row of openRows) {
              openingBalances[row.member_id_num] = {
                opening_shares: parseFloat(row.opening_shares || 0),
                opening_savings: parseFloat(row.opening_savings || 0),
                opening_loan_amount: parseFloat(row.opening_loan_amount || 0),
                opening_loan_repayment: parseFloat(
                  row.opening_loan_repayment || 0
                ),
                opening_interest_charged: parseFloat(
                  row.opening_interest_charged || 0
                ),
                opening_interest_paid: parseFloat(
                  row.opening_interest_paid || 0
                ),
                opening_commodity_amount: parseFloat(
                  row.opening_commodity_amount || 0
                ),
                opening_commodity_repayment: parseFloat(
                  row.opening_commodity_repayment || 0
                ),
                opening_dev_levy: parseFloat(row.opening_dev_levy || 0),
                opening_stationery: parseFloat(row.opening_stationery || 0),
                opening_entry_fees: parseFloat(row.opening_entry_fees || 0),
                opening_withdrawal: parseFloat(row.opening_withdrawal || 0),
              };
            }
          }

          // 3. Fetch the main report rows as before, but also fetch withdrawals for each period
          const [rows] = await connection.query(
            `WITH AggregatedData AS (
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
                    COALESCE(SUM(ef.amount), 0) AS entry_fees,
                    COALESCE(SUM(w.amount), 0) AS withdrawal
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
                  LEFT JOIN withdrawals w ON m.id = w.member_id AND p.id = w.period_id
                  WHERE p.id BETWEEN ? AND ?
                   ${searchMemberId ? "AND m.id = ?" : ""}
                  GROUP BY m.id, m.member_id, m.first_name, m.last_name, p.id, p.name
                )
                SELECT 
                  *
                FROM AggregatedData
                ORDER BY member_id_num, period_id;`,
            periodRange
          );

          // 4. Insert opening balance row for each member at the start of their data
          let reportRows = [];
          let lastMemberId = null;
          let sn = 1;
          // Running totals for each member
          let runningShares = 0,
            runningSavings = 0,
            runningLoan = 0,
            runningLoanRepayment = 0,
            runningInterestCharged = 0,
            runningInterestPaid = 0,
            runningUnpaidInterest = 0,
            runningCommodity = 0,
            runningCommodityRepayment = 0,
            runningCommodityBalance = 0,
            runningDevLevy = 0,
            runningStationery = 0,
            runningEntryFees = 0,
            runningWithdrawal = 0;
          for (const row of rows) {
            if (row.member_id_num !== lastMemberId) {
              // Insert opening balance row
              const open = openingBalances[row.member_id_num] || {
                opening_shares: 0,
                opening_savings: 0,
                opening_loan_amount: 0,
                opening_loan_repayment: 0,
                opening_interest_charged: 0,
                opening_interest_paid: 0,
                opening_commodity_amount: 0,
                opening_commodity_repayment: 0,
                opening_dev_levy: 0,
                opening_stationery: 0,
                opening_entry_fees: 0,
                opening_withdrawal: 0,
              };
              const openingLoanBalance =
                open.opening_loan_amount - open.opening_loan_repayment;
              const openingUnpaidInterest =
                open.opening_interest_charged - open.opening_interest_paid;
              const openingCommodityBalance =
                open.opening_commodity_amount -
                open.opening_commodity_repayment;
              const openingTotal = (
                open.opening_shares +
                open.opening_savings +
                open.opening_loan_repayment +
                open.opening_interest_paid +
                open.opening_commodity_repayment +
                open.opening_dev_levy +
                open.opening_stationery +
                open.opening_entry_fees +
                open.opening_withdrawal
              ).toFixed(2);
              reportRows.push([
                sn++,
                row.member_id || "N/A",
                `${row.first_name || "N/A"} ${row.last_name || "N/A"}`,
                `Opening Balance (Before ${row.period_name})`,
                open.opening_shares.toFixed(2),
                open.opening_shares.toFixed(2),
                open.opening_savings.toFixed(2),
                open.opening_savings.toFixed(2),
                open.opening_loan_amount.toFixed(2),
                open.opening_loan_repayment.toFixed(2),
                openingLoanBalance.toFixed(2),
                open.opening_interest_charged.toFixed(2),
                open.opening_interest_paid.toFixed(2),
                openingUnpaidInterest.toFixed(2),
                open.opening_commodity_amount.toFixed(2),
                open.opening_commodity_repayment.toFixed(2),
                openingCommodityBalance.toFixed(2),
                open.opening_dev_levy.toFixed(2),
                open.opening_stationery.toFixed(2),
                open.opening_entry_fees.toFixed(2),
                open.opening_withdrawal.toFixed(2),
                openingTotal,
              ]);
              // Initialize running totals from opening balances
              runningShares = open.opening_shares;
              runningSavings = open.opening_savings;
              runningLoan = open.opening_loan_amount;
              runningLoanRepayment = open.opening_loan_repayment;
              runningInterestCharged = open.opening_interest_charged;
              runningInterestPaid = open.opening_interest_paid;
              runningCommodity = open.opening_commodity_amount;
              runningCommodityRepayment = open.opening_commodity_repayment;
              runningDevLevy = open.opening_dev_levy;
              runningStationery = open.opening_stationery;
              runningEntryFees = open.opening_entry_fees;
              runningWithdrawal = open.opening_withdrawal;
              lastMemberId = row.member_id_num;
            }
            // Add this period's amount to running totals
            runningShares += parseFloat(row.shares_amount || 0);
            runningSavings += parseFloat(row.savings_amount || 0);
            runningLoan += parseFloat(row.loan_amount || 0);
            runningLoanRepayment += parseFloat(row.loan_repayment || 0);
            runningInterestCharged += parseFloat(row.interest_charged || 0);
            runningInterestPaid += parseFloat(row.interest_paid || 0);
            runningCommodity += parseFloat(row.commodity_amount || 0);
            runningCommodityRepayment += parseFloat(
              row.commodity_repayment || 0
            );
            runningDevLevy += parseFloat(row.dev_levy || 0);
            runningStationery += parseFloat(row.stationery || 0);
            runningEntryFees += parseFloat(row.entry_fees || 0);
            runningWithdrawal += parseFloat(row.withdrawal || 0);
            // Calculate running balances
            const runningLoanBalance = runningLoan - runningLoanRepayment;
            const runningUnpaidInterest =
              runningInterestCharged - runningInterestPaid;
            const runningCommodityBalance =
              runningCommodity - runningCommodityRepayment;
            const total = (
              parseFloat(row.shares_amount || 0) +
              parseFloat(row.savings_amount || 0) +
              parseFloat(row.loan_repayment || 0) +
              parseFloat(row.interest_paid || 0) +
              parseFloat(row.commodity_repayment || 0) +
              parseFloat(row.dev_levy || 0) +
              parseFloat(row.stationery || 0) +
              parseFloat(row.entry_fees || 0) +
              parseFloat(row.withdrawal || 0)
            ).toFixed(2);
            reportRows.push([
              sn++,
              row.member_id || "N/A",
              `${row.first_name || "N/A"} ${row.last_name || "N/A"}`,
              row.period_name || "N/A",
              parseFloat(row.shares_amount || 0).toFixed(2),
              runningShares.toFixed(2),
              parseFloat(row.savings_amount || 0).toFixed(2),
              runningSavings.toFixed(2),
              parseFloat(row.loan_amount || 0).toFixed(2),
              parseFloat(row.loan_repayment || 0).toFixed(2),
              runningLoanBalance.toFixed(2),
              parseFloat(row.interest_charged || 0).toFixed(2),
              parseFloat(row.interest_paid || 0).toFixed(2),
              runningUnpaidInterest.toFixed(2),
              parseFloat(row.commodity_amount || 0).toFixed(2),
              parseFloat(row.commodity_repayment || 0).toFixed(2),
              runningCommodityBalance.toFixed(2),
              parseFloat(row.dev_levy || 0).toFixed(2),
              parseFloat(row.stationery || 0).toFixed(2),
              parseFloat(row.entry_fees || 0).toFixed(2),
              parseFloat(row.withdrawal || 0).toFixed(2),
              total,
            ]);
          }

          reportTable.rows = reportRows;

          reportTable.footer = this.computeFooter(
            report_type,
            reportTable.headers,
            reportTable.rows
          );

          reportData = {
            reportTable,
            member_ids: rows.map((row) => row.member_id_num || "N/A"),
            period_ids: rows.map((row) => row.period_id || "N/A"),
            message: delete_transactions
              ? "Transactions deleted and custom spreadsheet report generated successfully"
              : "Custom spreadsheet report with running balances generated successfully",
          };
          break;
        }

        default:
          return ResponseHandler.error(res, "Unsupported report type", 400);
      }

      if (export_format) {
        const reportTitle = `${report_type}_${fromId}_to_${toId}`;
        let headers = [];
        let rows = [];
        let footer = [];

        switch (report_type) {
          case "member_financial_summary":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            footer = reportData.reportTable.footer;
            break;
          case "loan_performance":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            footer = reportData.reportTable.footer;
            break;
          case "fee_collection":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            footer = reportData.reportTable.footer;
            break;
          case "savings_shares_growth":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            footer = reportData.reportTable.footer;
            break;
          case "commodity_transactions":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            footer = reportData.reportTable.footer;
            break;
          case "overdue_loans":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            footer = reportData.reportTable.footer;
            break;
          case "interest_summary":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            footer = reportData.reportTable.footer;
            break;
          case "loan_repayment_summary":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            footer = reportData.reportTable.footer;
            break;
          case "custom_spreadsheet_report":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            footer = reportData.reportTable.footer;
            break;
          default:
            return ResponseHandler.error(
              res,
              "Unsupported report type for export",
              400
            );
        }

        if (export_format === "excel") {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet(reportTitle);

          worksheet.addRow(headers);
          worksheet.getRow(1).font = { bold: true };

          rows.forEach((row) => worksheet.addRow(row));

          if (footer.length > 0) {
            worksheet.addRow(footer);
            const footerRow = worksheet.lastRow;
            footerRow.font = { bold: true };
            footerRow.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "D3D3D3" },
            };
          }

          worksheet.columns.forEach((column) => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
              const columnLength = cell.value
                ? cell.value.toString().length
                : 0;
              if (columnLength > maxLength) {
                maxLength = columnLength;
              }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
          });

          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${reportTitle}.xlsx"`
          );

          const buffer = await workbook.xlsx.writeBuffer();
          return res.status(200).send(buffer);
        } else if (export_format === "pdf") {
          if (!PDFDocument) {
            return ResponseHandler.error(
              res,
              "PDF export is not available due to missing pdfkit module",
              500
            );
          }

          const doc = new PDFDocument({ size: "A4", margin: 50 });
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${reportTitle}.pdf"`
          );

          doc.pipe(res);

          doc.fontSize(16).text(reportTitle.replace(/_/g, " ").toUpperCase(), {
            align: "center",
          });
          doc.moveDown();

          const tableTop = doc.y;
          const columnCount = headers.length;
          const columnWidth = (doc.page.width - 100) / columnCount;
          let x = 50;

          headers.forEach((header) => {
            doc
              .fontSize(10)
              .text(header, x, tableTop, { width: columnWidth, align: "left" });
            x += columnWidth;
          });

          doc.moveDown();
          let y = doc.y;
          rows.forEach((row) => {
            x = 50;
            row.forEach((cell) => {
              doc.fontSize(8).text(cell.toString(), x, y, {
                width: columnWidth,
                align: "left",
              });
              x += columnWidth;
            });
            y += 15;
            if (y > doc.page.height - 50) {
              doc.addPage();
              y = 50;
            }
          });

          if (footer.length > 0) {
            y += 15;
            x = 50;
            footer.forEach((cell) => {
              doc
                .fontSize(8)
                .font("Helvetica-Bold")
                .text(cell || "", x, y, { width: columnWidth, align: "left" });
              x += columnWidth;
            });
            doc.font("Helvetica");
          }

          doc.end();
          return;
        }
      }

      return ResponseHandler.success(res, reportData);
    } catch (error) {
      await connection.rollback();
      console.error("Generate reports error:", error.message, error.stack);
      return ResponseHandler.error(
        res,
        error.message || "Failed to generate reports",
        500
      );
    } finally {
      connection.release();
    }
  }
}

module.exports = new ReportController();
