const pool = require("../config/database");
const ResponseHandler = require("../utils/response");
const ExcelJS = require("exceljs");

let PDFDocument = null;
try {
  PDFDocument = require("pdfkit");
} catch (error) {
  console.error("Failed to load pdfkit:", error.message);
}

class PeriodController {
  // Create a new period (e.g., "February 2025")
  async createPeriod(req, res) {
    const connection = await pool.getConnection();
    try {
      const { name } = req.body;
      const createdBy = req.user.id;

      if (!name) return ResponseHandler.error(res, "Period name required", 400);

      const [existing] = await connection.execute(
        `SELECT id FROM periods WHERE name = ?`,
        [name]
      );
      if (existing.length > 0) {
        return ResponseHandler.error(
          res,
          `Period "${name}" already exists`,
          400
        );
      }

      await connection.execute(
        `INSERT INTO periods (name, status, created_at, created_by) 
         VALUES (?, 'open', NOW(), ?)`,
        [name, createdBy]
      );

      ResponseHandler.success(
        res,
        null,
        `Period "${name}" created successfully`,
        201
      );
    } catch (error) {
      console.error("Create period error:", error.message, error.stack);
      ResponseHandler.error(res, error.message || "Failed to create period");
    } finally {
      connection.release();
    }
  }

  async getContributionSum(req, res) {
    const connection = await pool.getConnection();
    try {
      const { periodId } = req.params;
      if (!periodId) {
        return ResponseHandler.error(res, "Period ID is required", 400);
      }

      const [rows] = await connection.execute(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM contributions WHERE period_id = ?`,
        [periodId]
      );

      const total = rows[0].total || 0;
      ResponseHandler.success(
        res,
        total,
        "Contribution sum retrieved successfully"
      );
    } catch (error) {
      console.error(
        "Error fetching contribution sum:",
        error.message,
        error.stack
      );
      ResponseHandler.error(
        res,
        error.message || "Failed to fetch contribution sum",
        500
      );
    } finally {
      if (connection) connection.release();
    }
  }

  // List all periods
  async listPeriods(req, res) {
    const connection = await pool.getConnection();
    try {
      const [periods] = await connection.execute(
        `SELECT id, name, status, created_at FROM periods ORDER BY id DESC`
      );
      ResponseHandler.success(res, periods);
    } catch (error) {
      console.error("List periods error:", error.message, error.stack);
      ResponseHandler.error(res, "Failed to fetch periods");
    } finally {
      connection.release();
    }
  }

  getLoanActivationThreshold = async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const [config] = await connection.execute(
        `SELECT setting_value AS threshold FROM config_settings WHERE setting_key = ?`,
        ["loan_activation_day_threshold"]
      );
      const threshold = config[0]?.threshold || 5;
      ResponseHandler.success(res, { threshold }); // Ensure { threshold } is in data
    } catch (error) {
      console.error("Get threshold error:", error.message);
      ResponseHandler.error(res, "Failed to fetch threshold", 500);
    } finally {
      connection.release();
    }
  };

  // Update loan activation day threshold
  updateLoanActivationThreshold = async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { threshold } = req.body;
      if (
        !threshold ||
        isNaN(parseInt(threshold)) ||
        parseInt(threshold) < 1 ||
        parseInt(threshold) > 31
      ) {
        return ResponseHandler.error(
          res,
          "Valid day threshold (1-31) is required",
          400
        );
      }

      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO config_settings (setting_key, setting_value) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?`,
        ["loan_activation_day_threshold", threshold, threshold]
      );
      await connection.commit();
      ResponseHandler.success(
        res,
        { threshold },
        "Threshold updated successfully"
      );
    } catch (error) {
      await connection.rollback();
      console.error("Update threshold error:", error.message);
      ResponseHandler.error(res, "Failed to update threshold", 500);
    } finally {
      connection.release();
    }
  };

  // Process a period for all or a specific member
  processPeriod = async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { periodId, memberId = -1 } = req.body;
      console.log("Request Body:", { periodId, memberId });
      if (!periodId)
        return ResponseHandler.error(res, "Period ID required", 400);

      await connection.beginTransaction();

      // Validate period
      const [periods] = await connection.execute(
        `SELECT id, name, status FROM periods WHERE id = ?`,
        [periodId]
      );
      if (periods.length === 0) {
        throw new Error("Period not found");
      }
      if (periods[0].status === "processed") {
        // throw new Error("Period already processed");
      }
      const periodName = periods[0].name;

      // Fetch fixed fees
      const [feeConfigs] = await connection.execute(
        `SELECT fee_type, amount FROM fixed_fees_config`
      );
      const fees = Object.fromEntries(
        feeConfigs.map((f) => [f.fee_type, parseFloat(f.amount)])
      );

      const [config] = await connection.execute(
        `SELECT setting_value FROM config_settings WHERE setting_key = ?`,
        ["loan_activation_day_threshold"]
      );
      const dayThreshold = parseInt(config[0]?.setting_value) || 5; // Default to 5 if not found

      // Fetch contribution settings
      const [settings] = await connection.execute(
        `SELECT shares_ratio, savings_ratio FROM contribution_settings ORDER BY id DESC LIMIT 1`
      );
      if (!settings.length) throw new Error("Contribution settings not found");
      const sharesRate = parseFloat(settings[0].shares_ratio);
      const savingsRate = parseFloat(settings[0].savings_ratio);
      if (savingsRate <= 0 || sharesRate <= 0) {
        throw new Error("Invalid contribution rates");
      }
      const totalRate = savingsRate + sharesRate;
      const normalizedSavingsRate =
        totalRate !== 1.0 ? savingsRate / totalRate : savingsRate;
      const normalizedSharesRate =
        totalRate !== 1.0 ? sharesRate / totalRate : sharesRate;
      if (totalRate !== 1.0) {
        console.warn(
          `Normalized rates: savings=${normalizedSavingsRate}, shares=${normalizedSharesRate}`
        );
      }

      // Fetch interest rate
      const [loanTypes] = await connection.execute(
        `SELECT interest_rate FROM loan_types LIMIT 1`
      );
      const interestRate =
        loanTypes.length > 0 ? parseFloat(loanTypes[0].interest_rate) : 0.015;

      // Fetch active members
      let memberQuery = `
      SELECT id, entry_fee_paid, user_id, allow_savings_with_loan, savings_with_loan_amount, stop_loan_interest, first_name, last_name
      FROM members 
      WHERE membership_status = 'active'`;
      const queryParams = memberId !== -1 ? [memberId] : [];
      if (memberId !== -1) memberQuery += ` AND id = ?`;
      const [members] = await connection.execute(memberQuery, queryParams);
      const totalMembers = members.length;

      console.log(`Processing ${totalMembers} members for period ${periodId}`);

      if (totalMembers === 0) {
        await connection.commit();
        return ResponseHandler.success(res, [], "No active members to process");
      }

      const results = [];
      let processedMembers = 0;

      for (const member of members) {
        const memberId = member.id;

        // Check if transaction is completed
        const [transactCheck] = await connection.execute(
          `SELECT id FROM mastertransact WHERE member_id = ? AND period_id = ? AND transaction_type = 'period_processed' AND completed = 1`,
          [memberId, periodId]
        );
        if (transactCheck.length > 0) {
          console.warn(
            `Skipping member ${memberId}: transaction completed for period ${periodId}`
          );
          processedMembers++;
          continue;
        }

        // Check for partial transactions
        const transactionTables = [
          "entry_fees",
          "development_levy_fees",
          "stationery_fees",
          "commodity_repayments",
          "interest_charged",
          "interest_paid",
          "loan_repayments",
          "member_balances",
        ];
        let partialFound = false;
        for (const table of transactionTables) {
          const [records] = await connection.execute(
            `SELECT id FROM ${table} WHERE member_id = ? AND period_id = ? LIMIT 1`,
            [memberId, periodId]
          );
          if (records.length > 0) {
            partialFound = true;
            break;
          }
        }
        if (partialFound) {
          throw new Error(
            `Incomplete transaction data for member ${memberId} in period ${periodId}. Please delete or complete transactions.`
          );
        }

        // Calculate balances
        const balances = await this.calculateBalances(
          connection,
          memberId,
          periodId
        );
        let contri = balances.contri || 0;
        let outstandingLoanBalance = balances.lnb || 0;

        // Fetch stop_loan_interest for this member
        const [memberSettings] = await connection.execute(
          `SELECT stop_loan_interest FROM members WHERE id = ?`,
          [memberId]
        );
        const stopLoanInterest =
          memberSettings[0]?.stop_loan_interest === 1 ||
          memberSettings[0]?.stop_loan_interest === true;

        // 1. Process Entry Fee
        if (!member.entry_fee_paid && contri >= (fees.entry || 10000)) {
          const entryFee = fees.entry || 1000;
          await connection.execute(
            `INSERT INTO entry_fees (member_id, period_id, amount, created_at) VALUES (?, ?, ?, NOW())`,
            [memberId, periodId, entryFee]
          );
          await connection.execute(
            `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
            [memberId, periodId, "entry_fee", entryFee]
          );
          await connection.execute(
            `UPDATE members SET entry_fee_paid = TRUE WHERE id = ?`,
            [memberId]
          );
          contri -= entryFee;

          // Notification for entry fee
          const memberName = `${member.first_name} ${member.last_name}`;
          await this.insertNotification(
            connection,
            member.user_id,
            "Entry Fee Deducted",
            `Dear ${memberName}, an entry fee of ₦${entryFee.toLocaleString(
              "en-NG",
              { style: "currency", currency: "NGN" }
            )} has been deducted from your contribution for period ${periodName}.`
          );
        }

        // 2. Process Development Levy
        const memberName = `${member.first_name} ${member.last_name}`;
        async function processDevelopmentLevy(
          connection,
          memberId,
          periodId,
          contri,
          fees,
          userId,
          memberName,
          periodName
        ) {
          const baseLevy = fees.development_levy || 1000; // Default to ₦1000 if not configured
          const currentLevy = baseLevy;

          // Query outstanding debt periods
          const [debtRecords] = await connection.query(
            `SELECT id, period_id, outstanding_amount FROM member_levy_debt WHERE member_id = ? AND outstanding_amount = 0`,
            [memberId]
          );
          const outstandingMonths = debtRecords.length;
          const outstandingFee = outstandingMonths * baseLevy;
          const totalOwedFee = currentLevy + outstandingFee;

          if (contri > 0) {
            let paidAmount = 0;

            // Check if contribution covers total owed
            if (contri >= totalOwedFee) {
              paidAmount = totalOwedFee;
              contri -= totalOwedFee;

              // Insert full payment for current period
              await connection.query(
                `INSERT INTO development_levy_fees (member_id, period_id, amount, created_at)
                VALUES (?, ?, ?, NOW())`,
                [memberId, periodId, paidAmount]
              );
              await connection.query(
                `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount)
              VALUES (?, ?, ?, ?)`,
                [memberId, periodId, "development_levy", paidAmount]
              );

              // Notification for development levy
              await connection.execute(
                `INSERT INTO notifications (user_id, title, body, date) VALUES (?, ?, ?, NOW())`,
                [
                  userId,
                  "Development Levy Deducted",
                  `Dear ${memberName}, development levy of ₦${paidAmount.toLocaleString(
                    "en-NG",
                    { style: "currency", currency: "NGN" }
                  )} (including ${outstandingMonths} outstanding month${
                    outstandingMonths > 1 ? "s" : ""
                  }) has been deducted from your contribution for period ${periodName}.`,
                ]
              );

              // Insert current period debt with base levy
              await connection.query(
                `INSERT INTO member_levy_debt (member_id, period_id, outstanding_amount, created_at)
                VALUES (?, ?, ?, NOW())`,
                [memberId, periodId, baseLevy]
              );

              // Update previous debt records to base levy
              for (const record of debtRecords) {
                await connection.query(
                  `UPDATE member_levy_debt SET outstanding_amount = ? WHERE id = ?`,
                  [baseLevy, record.id]
                );
              }
            } else if (contri >= baseLevy) {
              paidAmount = baseLevy;
              contri -= baseLevy;

              // Insert minimum payment for current period
              await connection.query(
                `INSERT INTO development_levy_fees (member_id, period_id, amount, created_at)
                VALUES (?, ?, ?, NOW())`,
                [memberId, periodId, paidAmount]
              );
              await connection.query(
                `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount)
                VALUES (?, ?, ?, ?)`,
                [memberId, periodId, "development_levy", paidAmount]
              );

              // Notification for partial development levy
              await connection.execute(
                `INSERT INTO notifications (user_id, title, body, date) VALUES (?, ?, ?, NOW())`,
                [
                  userId,
                  "Development Levy Deducted (Partial)",
                  `Dear ${memberName}, development levy of ₦${paidAmount.toLocaleString(
                    "en-NG",
                    { style: "currency", currency: "NGN" }
                  )} has been deducted. You still have outstanding levy balance.`,
                ]
              );

              // Insert current period debt with base levy
              await connection.query(
                `INSERT INTO member_levy_debt (member_id, period_id, outstanding_amount, created_at)
                VALUES (?, ?, ?, NOW())`,
                [memberId, periodId, baseLevy]
              );
            } else {
              // Insufficient contribution, record as unpaid
              paidAmount = 0;
              await connection.query(
                `INSERT INTO development_levy_fees (member_id, period_id, amount, created_at)
                VALUES (?, ?, ?, NOW())`,
                [memberId, periodId, paidAmount]
              );
              await connection.query(
                `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount)
                VALUES (?, ?, ?, ?)`,
                [memberId, periodId, "development_levy", paidAmount]
              );

              // Insert current period debt with base levy
              await connection.query(
                `INSERT INTO member_levy_debt (member_id, period_id, outstanding_amount, created_at)
                VALUES (?, ?, ?, NOW())`,
                [memberId, periodId, baseLevy]
              );
              console.log(
                `Insufficient contribution from Member ${memberId} levy: Paid ${paidAmount}, Remaining contribution ${contri}`
              );
            }

            console.log(
              `Member ${memberId} levy: Paid ${paidAmount}, Remaining contribution ${contri}`
            );
          } else {
            await connection.query(
              `INSERT INTO member_levy_debt (member_id, period_id, outstanding_amount, created_at)
              VALUES (?, ?, ?, NOW())`,
              [memberId, periodId, 0]
            );
            await connection.query(
              `INSERT INTO development_levy_fees (member_id, period_id, amount, created_at)
              VALUES (?, ?, ?, NOW())`,
              [memberId, periodId, 0]
            );
            await connection.query(
              `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount)
            VALUES (?, ?, ?, ?)`,
              [memberId, periodId, "development_levy", 0]
            );
          }

          return contri;
        }
        contri = await processDevelopmentLevy(
          connection,
          memberId,
          periodId,
          contri,
          fees,
          member.user_id,
          memberName,
          periodName
        );

        // 3. Process Stationery Fee
        const [pendingLoans] = await connection.execute(
          `SELECT SUM(amount) AS total_loan_amount FROM loans WHERE member_id = ? AND period_id = ? AND status = 'pending'`,
          [memberId, periodId]
        );
        if (
          contri >= fees.stationery &&
          pendingLoans[0].total_loan_amount > 0
        ) {
          const totalLoanAmount = pendingLoans[0].total_loan_amount || 0;
          const stationeryFee = fees.stationery * totalLoanAmount;
          await connection.execute(
            `INSERT INTO stationery_fees (member_id, period_id, amount, created_at) VALUES (?, ?, ?, NOW())`,
            [memberId, periodId, stationeryFee]
          );
          await connection.execute(
            `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
            [memberId, periodId, "stationery_fee", stationeryFee]
          );
          contri -= stationeryFee;

          // Notification for stationery fee
          await this.insertNotification(
            connection,
            member.user_id,
            "Stationery Fee Deducted",
            `Dear ${memberName}, a stationery fee of ₦${stationeryFee.toLocaleString(
              "en-NG",
              { style: "currency", currency: "NGN" }
            )} has been deducted from your contribution for period ${periodName} (for loan processing).`
          );
        }

        // 4. Process Commodity Repayment
        const [totalCommodities] = await connection.execute(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM commodities WHERE member_id = ?`,
          [memberId]
        );
        const [totalCommodityRepayments] = await connection.execute(
          `SELECT COALESCE(SUM(amount), 0) AS total_repaid FROM commodity_repayments WHERE member_id = ?`,
          [memberId]
        );
        const cb =
          totalCommodities[0].total - totalCommodityRepayments[0].total_repaid;
        if (cb < 0) {
          throw new Error(
            `Invalid commodity balance for member ${memberId}: ${cb}`
          );
        }
        if (contri > 0 && cb > 0) {
          const [commodities] = await connection.execute(
            `SELECT id, amount, deduction_count FROM commodities WHERE member_id = ?`,
            [memberId]
          );
          let totalInstallment = 0;
          const remainingBalances = [];

          for (const commodity of commodities) {
            const [repayments] = await connection.execute(
              `SELECT COALESCE(SUM(amount), 0) AS total_repaid FROM commodity_repayments WHERE commodity_id = ? AND member_id = ?`,
              [commodity.id, memberId]
            );
            const totalRepaid = parseFloat(repayments[0].total_repaid);
            const remaining = commodity.amount - totalRepaid;
            if (remaining <= 0) continue;

            const deductionCount =
              commodity.deduction_count > 0 ? commodity.deduction_count : 1;
            const deductionsMade = totalRepaid
              ? Math.floor(totalRepaid / (commodity.amount / deductionCount))
              : 0;
            const remainingDeductions = deductionCount - deductionsMade;
            if (remainingDeductions > 0) {
              const installment = remaining / remainingDeductions;
              totalInstallment += installment;
              remainingBalances.push({ commodity, installment, remaining });
            }
          }

          if (remainingBalances.length > 0) {
            if (contri >= totalInstallment) {
              for (const { commodity, installment } of remainingBalances) {
                await connection.execute(
                  `INSERT INTO commodity_repayments (commodity_id, member_id, period_id, amount, payment_date) VALUES (?, ?, ?, ?, CURDATE())`,
                  [commodity.id, memberId, periodId, installment]
                );
                await connection.execute(
                  `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
                  [memberId, periodId, "commodity_repayment", installment]
                );
              }
              contri -= totalInstallment;

              // Notification for commodity repayment
              await this.insertNotification(
                connection,
                member.user_id,
                "Commodity Repayment",
                `Dear ${memberName}, commodity repayment of ₦${totalInstallment.toLocaleString(
                  "en-NG",
                  { style: "currency", currency: "NGN" }
                )} has been deducted from your contribution for period ${periodName}.`
              );
            } else {
              const ratio =
                totalInstallment > 0 ? contri / totalInstallment : 0;
              for (const { commodity, installment } of remainingBalances) {
                const partialPayment = installment * ratio;
                await connection.execute(
                  `INSERT INTO commodity_repayments (commodity_id, member_id, period_id, amount, payment_date) VALUES (?, ?, ?, ?, CURDATE())`,
                  [commodity.id, memberId, periodId, partialPayment]
                );
                await connection.execute(
                  `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
                  [memberId, periodId, "commodity_repayment", partialPayment]
                );
              }
              contri = 0;
            }
            console.log(
              `Processed commodity repayments for member ${memberId}: total=${totalInstallment}`
            );
          }
        } else if (contri === 0 && cb > 0) {
          // Notification for outstanding commodity balance
          await this.insertNotification(
            connection,
            member.user_id,
            "Outstanding Commodity Balance",
            `Dear ${memberName}, you have an outstanding commodity balance of ₦${cb.toLocaleString(
              "en-NG",
              { style: "currency", currency: "NGN" }
            )} for period ${periodName}. Please make a contribution to clear this balance.`
          );
          await connection.execute(
            `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
            [memberId, periodId, "notification_commodity", 0]
          );
        }

        // Update loan status to 'active' if grant_date day < 5
        await connection.execute(
          `UPDATE loans 
           SET status = 'active' 
           WHERE member_id = ? 
           AND period_id = ? 
           AND DAY(grant_date) <= ? 
           AND grant_date IS NOT NULL 
           AND status IN ('pending', 'approved')`,
          [memberId, periodId, dayThreshold]
        );

        // 5. Process Loan Repayment
        const [totalLoans] = await connection.execute(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM loans WHERE member_id = ? AND status NOT IN ('pending', 'approved')`,
          [memberId]
        );
        const [totalLoanRepayments] = await connection.execute(
          `SELECT COALESCE(SUM(amount), 0) AS total_repaid FROM loan_repayments WHERE member_id = ?`,
          [memberId]
        );
        outstandingLoanBalance =
          totalLoans[0].total - totalLoanRepayments[0].total_repaid;
        console.warn(
          `Outstanding loan balance for member ${memberId}: ${outstandingLoanBalance}`
        );
        if (outstandingLoanBalance > 0) {
          console.log(
            `Processing loan repayment for member ${memberId} here is the outstandingLoanBalance: ${outstandingLoanBalance}`
          );
          // Only charge interest if stop_loan_interest is not set
          let currentInterest = 0;
          if (!stopLoanInterest) {
            currentInterest = outstandingLoanBalance * interestRate;
            await connection.execute(
              `INSERT INTO interest_charged (member_id, period_id, amount, charged_date) VALUES (?, ?, ?, CURDATE())`,
              [memberId, periodId, currentInterest]
            );
            await connection.execute(
              `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
              [memberId, periodId, "interest_charged", currentInterest]
            );

            // Notification for interest charged
            await this.insertNotification(
              connection,
              member.user_id,
              "Interest Charged",
              `Dear ${memberName}, interest of ₦${currentInterest.toLocaleString(
                "en-NG",
                { style: "currency", currency: "NGN" }
              )} has been charged on your loan balance for period ${periodName}.`
            );
          } else {
            // Insert zero interest for this period
            await connection.execute(
              `INSERT INTO interest_charged (member_id, period_id, amount, charged_date) VALUES (?, ?, ?, CURDATE())`,
              [memberId, periodId, 0]
            );
            await connection.execute(
              `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
              [memberId, periodId, "interest_charged", 0]
            );
            console.log(
              `Interest calculation skipped for member ${memberId} due to stop_loan_interest setting. Zero interest recorded.`
            );
          }

          if (contri > 0) {
            console.log(
              `Processing contributions for member ${memberId} with the value of contri: ${contri}`
            );
            const [totalInterestCharged] = await connection.execute(
              `SELECT COALESCE(SUM(amount), 0) AS total FROM interest_charged WHERE member_id = ? AND period_id <= ?`,
              [memberId, periodId]
            );
            const [totalInterestPaid] = await connection.execute(
              `SELECT COALESCE(SUM(amount), 0) AS total FROM interest_paid WHERE member_id = ? AND period_id <= ?`,
              [memberId, periodId]
            );
            const outstandingInterest =
              totalInterestCharged[0].total - totalInterestPaid[0].total;
            if (outstandingInterest < 0) {
              throw new Error(
                `Invalid outstanding interest for member ${memberId}`
              );
            }

            // Pay outstanding interest first
            let interestPayment = 0;
            if (outstandingInterest > 0 && contri >= outstandingInterest) {
              interestPayment = outstandingInterest;
            } else if (outstandingInterest > 0) {
              interestPayment = contri;
            }
            if (interestPayment > 0) {
              await connection.execute(
                `INSERT INTO interest_paid (member_id, period_id, amount, payment_date) VALUES (?, ?, ?, CURDATE())`,
                [memberId, periodId, interestPayment]
              );
              await connection.execute(
                `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
                [memberId, periodId, "interest_paid", interestPayment]
              );
              contri -= interestPayment;

              // Notification for interest paid
              await this.insertNotification(
                connection,
                member.user_id,
                "Interest Paid",
                `Dear ${memberName}, interest payment of ₦${interestPayment.toLocaleString(
                  "en-NG",
                  { style: "currency", currency: "NGN" }
                )} has been deducted from your contribution for period ${periodName}.`
              );
            }
            console.log(
              `Savings amount for member ${memberId}: and contri before saving deduction: ${contri}`
            );
            let savingsAmount = 0;
            if (outstandingLoanBalance > 0 && member.allow_savings_with_loan) {
              savingsAmount = parseFloat(member.savings_with_loan_amount) || 0;
              if (contri > savingsAmount) {
                contri -= savingsAmount;
              }
            }
            console.log(
              `Savings amount for member ${memberId}: ${savingsAmount} and contri after saving deduction: ${contri}`
            );
            // Process principal repayment
            if (contri > 0 && outstandingLoanBalance > 0) {
              let principalPayment = Math.floor(contri / 10) * 10;
              if (principalPayment > outstandingLoanBalance) {
                console.warn(
                  `Capping principalPayment for member ${memberId}: ${principalPayment} reduced to ${outstandingLoanBalance}`
                );
                principalPayment = outstandingLoanBalance;
              }

              if (principalPayment > 0) {
                const [activeLoans] = await connection.execute(
                  `SELECT id, amount FROM loans WHERE member_id = ? AND status = 'active'`,
                  [memberId]
                );
                console.log(
                  `Active loans for member ${memberId}:`,
                  activeLoans.length
                ); // Should log 2 for member 3
                let totalRepaid = 0;
                let remainingPrincipalPayment = principalPayment;

                for (const loan of activeLoans) {
                  const [loanRepayments] = await connection.execute(
                    `SELECT COALESCE(SUM(amount), 0) AS total_repaid FROM loan_repayments WHERE loan_id = ? AND member_id = ?`,
                    [loan.id, memberId]
                  );
                  const remainingPrincipal =
                    loan.amount - loanRepayments[0].total_repaid;
                  if (remainingPrincipal <= 0) continue;

                  let loanPayment =
                    (remainingPrincipal / outstandingLoanBalance) *
                    principalPayment;
                  if (loanPayment > remainingPrincipal) {
                    console.warn(
                      `Capping loanPayment for member ${memberId}, loan ${loan.id}: ${loanPayment} reduced to ${remainingPrincipal}`
                    );
                    loanPayment = remainingPrincipal;
                  }
                  if (loanPayment > remainingPrincipalPayment) {
                    loanPayment = remainingPrincipalPayment;
                  }

                  if (loanPayment > 0) {
                    await connection.execute(
                      `INSERT INTO loan_repayments (member_id, loan_id, period_id, amount, interest_amount, principal_amount, due_date, payment_date, status) 
                    VALUES (?, ?, ?, ?, ?, ?, CURDATE(), CURDATE(), ?)`,
                      [
                        memberId,
                        loan.id,
                        periodId,
                        loanPayment,
                        0,
                        loanPayment,
                        "paid",
                      ]
                    );
                    totalRepaid += loanPayment;
                    remainingPrincipalPayment -= loanPayment;

                    if (remainingPrincipal - loanPayment <= 0) {
                      await connection.execute(
                        `UPDATE loans SET status = 'completed' WHERE id = ?`,
                        [loan.id]
                      );
                    }
                  }

                  if (remainingPrincipalPayment <= 0) break;
                }

                // Aggregate into a single mastertransact record for loan_repayment
                const [existingRepayment] = await connection.execute(
                  `SELECT id, amount FROM mastertransact WHERE member_id = ? AND period_id = ? AND transaction_type = 'loan_repayment'`,
                  [memberId, periodId]
                );
                const newTotalRepaid =
                  totalRepaid +
                  (existingRepayment.length > 0
                    ? parseFloat(existingRepayment[0].amount)
                    : 0);
                if (existingRepayment.length > 0) {
                  console.warn(
                    `Updating existing loan repayment for member ${memberId}, period ${periodId}, new total: ${newTotalRepaid}`
                  );
                  await connection.execute(
                    `UPDATE mastertransact SET amount = ? WHERE id = ?`,
                    [newTotalRepaid, existingRepayment[0].id]
                  );
                } else {
                  console.log(
                    `Inserting new loan repayment for member ${memberId}, period ${periodId}, amount: ${newTotalRepaid}`
                  );
                  await connection.execute(
                    `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount, created_at) VALUES (?, ?, ?, ?, NOW())`,
                    [memberId, periodId, "loan_repayment", newTotalRepaid]
                  );
                }

                contri -= totalRepaid;
                console.log(
                  `Total repaid for member ${memberId} in period ${periodId}: ${totalRepaid}`
                );

                // Notification for loan repayment
                if (totalRepaid > 0) {
                  await this.insertNotification(
                    connection,
                    member.user_id,
                    "Loan Repayment",
                    `Dear ${memberName}, loan repayment of ₦${totalRepaid.toLocaleString(
                      "en-NG",
                      { style: "currency", currency: "NGN" }
                    )} has been deducted from your contribution for period ${periodName}. Remaining loan balance: ₦${(
                      outstandingLoanBalance - totalRepaid
                    ).toLocaleString("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    })}.`
                  );
                }
              }
            }

            // Allocate remaining contribution to savings
            contri += parseFloat(savingsAmount) || 0;
            if (contri > 0) {
              const [balanceCheck] = await connection.execute(
                `SELECT id FROM member_balances WHERE member_id = ? AND period_id = ?`,
                [memberId, periodId]
              );
              if (balanceCheck.length > 0) {
                console.warn(
                  `Skipping savings allocation for member ${memberId}: member_balances record exists`
                );
              } else {
                console.log(
                  `Allocating remaining contribution to savings for member ${memberId} the value of the contri is ${contri}`
                );
                await connection.execute(
                  `INSERT INTO member_balances (member_id, period_id, savings, shares) VALUES (?, ?, ?, ?)`,
                  [memberId, periodId, contri, 0]
                );
                await connection.execute(
                  `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
                  [memberId, periodId, "savings", contri]
                );
                console.log(
                  `Allocated savings=${contri} for member ${memberId}`
                );

                // Notification for savings allocation (with loan)
                await this.insertNotification(
                  connection,
                  member.user_id,
                  "Savings Allocated",
                  `Dear ${memberName}, savings of ₦${contri.toLocaleString(
                    "en-NG",
                    { style: "currency", currency: "NGN" }
                  )} has been allocated to your account for period ${periodName}.`
                );
                contri = 0;
              }
            }
          } else {
            const [totalInterestCharged] = await connection.execute(
              `SELECT COALESCE(SUM(amount), 0) AS total FROM interest_charged WHERE member_id = ? AND period_id <= ?`,
              [memberId, periodId]
            );
            const [totalInterestPaid] = await connection.execute(
              `SELECT COALESCE(SUM(amount), 0) AS total FROM interest_paid WHERE member_id = ? AND period_id <= ?`,
              [memberId, periodId]
            );
            const outstandingInterest =
              totalInterestCharged[0].total - totalInterestPaid[0].total;
            if (outstandingInterest < 0) {
              throw new Error(
                `Invalid outstanding interest for member ${memberId}`
              );
            }

            const [overdueCheck] = await connection.execute(
              `SELECT id FROM loans WHERE member_id = ? AND due_date < CURDATE() AND status = 'active'`,
              [memberId]
            );
            if (overdueCheck.length > 0) {
              await connection.execute(
                `INSERT INTO loan_repayments (member_id, loan_id, period_id, amount, interest_amount, principal_amount, due_date, payment_date, status) 
                 VALUES (?, ?, ?, ?, ?, ?, CURDATE(), CURDATE(), ?)`,
                [memberId, 0, periodId, 0, 0, 0, "overdue"]
              );
              // Notification for missed loan repayment
              await this.insertNotification(
                connection,
                member.user_id,
                "Missed Loan Repayment",
                `Dear ${memberName}, you missed a repayment in period ${periodName}. Your outstanding balance is ₦${(
                  outstandingLoanBalance + outstandingInterest
                ).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}.`
              );
              await connection.execute(
                `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
                [memberId, periodId, "notification_loan", 0]
              );
            }
          }
        }

        // 6. Process Savings and Shares
        if (contri > 0 && cb === 0 && outstandingLoanBalance === 0) {
          const [balanceCheck] = await connection.execute(
            `SELECT id FROM member_balances WHERE member_id = ? AND period_id = ?`,
            [memberId, periodId]
          );
          if (balanceCheck.length > 0) {
            console.warn(
              `Skipping savings/shares allocation for member ${memberId}: member_balances record exists`
            );
          } else {
            const savingsAmount = contri * normalizedSavingsRate;
            const sharesAmount = contri * normalizedSharesRate;
            await connection.execute(
              `INSERT INTO member_balances (member_id, period_id, savings, shares) VALUES (?, ?, ?, ?)`,
              [memberId, periodId, savingsAmount, sharesAmount]
            );
            await connection.execute(
              `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
              [memberId, periodId, "savings", savingsAmount]
            );
            await connection.execute(
              `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount) VALUES (?, ?, ?, ?)`,
              [memberId, periodId, "shares", sharesAmount]
            );
            console.log(
              `Allocated savings=${savingsAmount}, shares=${sharesAmount} for member ${memberId}`
            );

            // Notification for savings/shares allocation (no loan)
            await this.insertNotification(
              connection,
              member.user_id,
              "Savings & Shares Allocated",
              `Dear ${memberName}, your contribution for period ${periodName} has been allocated: Savings: ₦${savingsAmount.toLocaleString(
                "en-NG",
                { style: "currency", currency: "NGN" }
              )}, Shares: ₦${sharesAmount.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
              })}.`
            );
            contri = 0;
          }
        }

        // 7. Activate Pending Loans
        await connection.execute(
          `UPDATE loans SET status = 'active', start_date = CURDATE() WHERE member_id = ? AND period_id = ? AND status = 'pending'`,
          [memberId, periodId]
        );

        // Send summary notification
        await this.insertNotification(
          connection,
          member.user_id,
          `Period ${periodName} Processed`,
          `Dear ${memberName}, your monthly deductions for period ${periodName} have been processed. Check your statement for details.`
        );

        // Mark transaction as completed
        await connection.execute(
          `INSERT INTO mastertransact (member_id, period_id, transaction_type, amount, completed) VALUES (?, ?, ?, ?, ?)`,
          [memberId, periodId, "period_processed", 0, 1]
        );

        processedMembers++;
        const percent = ((processedMembers / totalMembers) * 100).toFixed(2);
        console.log(`Processing member ${memberId}: ${percent}% complete`);

        results.push({
          memberId,
          remainingContribution: contri,
          outstandingLoanBalance: outstandingLoanBalance || 0,
        });
      }

      // Update period status
      await connection.execute(
        `UPDATE periods SET status = 'processed' WHERE id = ?`,
        [periodId]
      );

      await connection.commit();
      ResponseHandler.success(res, results, "Period processed successfully");
    } catch (error) {
      await connection.rollback();
      console.error("Process period error:", error.message, error.stack);
      ResponseHandler.error(
        res,
        error.message || "Failed to process period",
        500
      );
    } finally {
      connection.release();
    }
  };

  // Generate reports
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

      const {
        report_type = "member_financial_summary",
        period_from,
        period_to,
        member_id,
        delete_transactions = false,
        export_format,
      } = req.body;

      console.log("Extracted Values:", {
        report_type,
        period_from,
        period_to,
        member_id,
        delete_transactions,
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
            "Total Interest Charged",
            "Total Interest Paid",
            "Total Loan Repaid",
            "Total Commodity Repaid",
            "Savings",
            "Shares",
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
              SELECT COALESCE(SUM(amount), 0) as total_loans,
                     COALESCE(SUM(interest_charged), 0) as total_interest_charged
              FROM loans
              WHERE member_id = ? AND period_id BETWEEN ? AND ?
            `,
              [member.id, fromId, toId]
            );

            const [repayments] = await connection.query(
              `
              SELECT COALESCE(SUM(amount), 0) as total_loan_repaid,
                     COALESCE(SUM(interest_amount), 0) as total_interest_paid
              FROM loan_repayments
              WHERE member_id = ? AND period_id BETWEEN ? AND ?
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
              WHERE member_id = ? AND period_id = ?
            `,
              [member.id, toId]
            );

            if (delete_transactions && searchMemberId) {
              await connection.query(
                "DELETE FROM transactions WHERE member_id = ? AND period_id BETWEEN ? AND ?",
                [searchMemberId, fromId, toId]
              );
              console.log(`Deleted transactions for member ${searchMemberId}`);
            }

            const row = [
              member.member_id,
              `${member.first_name} ${member.last_name}`,
              contributions[0].total_contributions || 0,
              loans[0].total_loans || 0,
              loans[0].total_interest_charged || 0,
              repayments[0].total_interest_paid || 0,
              repayments[0].total_loan_repaid || 0,
              commodityRepayments[0].total_commodity_repaid || 0,
              balances[0].savings || 0,
              balances[0].shares || 0,
            ];

            reportTable.rows.push(row);
            memberIds.push(member.id);
          }

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

          reportData = {
            loans: loans.map((loan) => ({
              member_id: loan.member_id,
              first_name: loan.first_name,
              last_name: loan.last_name,
              loan_id: loan.loan_id,
              amount: loan.amount,
              interest_rate: loan.interest_rate,
              term: loan.term,
              status: loan.status,
              total_repaid: loan.total_repaid,
              remaining_balance: loan.remaining_balance,
            })),
            message: "Loan performance report generated successfully",
          };
          break;
        }

        case "fee_collection": {
          const [fees] = await connection.query(
            `
            SELECT m.member_id, m.first_name, m.last_name, f.fee_type, f.amount,
                   p.name as period_name, f.created_at
            FROM fees f
            JOIN members m ON m.id = f.member_id
            JOIN periods p ON p.id = f.period_id
            WHERE f.period_id BETWEEN ? AND ?
            ${searchMemberId ? "AND f.member_id = ?" : ""}
          `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          reportData = {
            fees: fees.map((fee) => ({
              member_id: fee.member_id,
              first_name: fee.first_name,
              last_name: fee.last_name,
              fee_type: fee.fee_type,
              amount: fee.amount,
              period_name: fee.period_name,
              created_at: fee.created_at,
            })),
            message: "Fee collection report generated successfully",
          };
          break;
        }

        case "savings_shares_growth": {
          const [balances] = await connection.query(
            `
            SELECT m.member_id, m.first_name, m.last_name, p.name as period_name,
                   mb.savings, mb.shares
            FROM member_balances mb
            JOIN members m ON m.id = mb.member_id
            JOIN periods p ON p.id = mb.period_id
            WHERE mb.period_id BETWEEN ? AND ?
            ${searchMemberId ? "AND mb.member_id = ?" : ""}
          `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          reportData = {
            balances: balances.map((balance) => ({
              member_id: balance.member_id,
              first_name: balance.first_name,
              last_name: balance.last_name,
              period_name: balance.period_name,
              savings: balance.savings,
              shares: balance.shares,
            })),
            message: "Savings and shares growth report generated successfully",
          };
          break;
        }

        case "commodity_transactions": {
          const [commodities] = await connection.query(
            `
            SELECT m.member_id, m.first_name, m.last_name, c.name as cname, c.amount as camount,
                   COALESCE(SUM(cr.amount), 0) as total_repaid,
                   p.name as period_name
            FROM commodities c
            JOIN members m ON m.id = c.member_id
            JOIN periods p ON p.id = c.period_id
            LEFT JOIN commodity_repayments cr ON cr.commodity_id = c.id
            WHERE c.period_id BETWEEN ? AND ?
            ${searchMemberId ? "AND c.member_id = ?" : ""}
            GROUP BY c.id, m.member_id, m.first_name, m.last_name, c.cname, c.amount, p.name
          `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          reportData = {
            commodities: commodities.map((commodity) => ({
              member_id: commodity.member_id,
              first_name: commodity.first_name,
              last_name: commodity.last_name,
              name: commodity.cname,
              amount: commodity.camount,
              total_repaid: commodity.total_repaid,
              period_name: commodity.period_name,
            })),
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
            message: "Overdue loans report generated successfully",
          };
          break;
        }

        case "interest_summary": {
          const [interest] = await connection.query(
            `
            SELECT COALESCE(SUM(l.interest_charged), 0) as total_interest_charged,
                   COALESCE(SUM(lr.interest_amount), 0) as total_interest_paid
            FROM loans l
            LEFT JOIN loan_repayments lr ON lr.loan_id = l.id
            WHERE l.period_id BETWEEN ? AND ?
            ${searchMemberId ? "AND l.member_id = ?" : ""}
          `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          const total_unpaid_interest =
            (interest[0].total_interest_charged || 0) -
            (interest[0].total_interest_paid || 0);

          reportData = {
            interest: {
              total_interest_charged: interest[0].total_interest_charged || 0,
              total_interest_paid: interest[0].total_interest_paid || 0,
              total_unpaid_interest: total_unpaid_interest,
            },
            message: "Interest summary report generated successfully",
          };
          break;
        }

        case "loan_repayment_summary": {
          const [repayments] = await connection.query(
            `
            SELECT m.member_id as member_number, m.first_name, m.last_name,
                   lr.loan_id, lr.amount, lr.principal_amount, lr.interest_amount,
                   lr.payment_date, lr.status
            FROM loan_repayments lr
            JOIN members m ON m.id = lr.member_id
            WHERE lr.period_id BETWEEN ? AND ?
            ${searchMemberId ? "AND lr.member_id = ?" : ""}
          `,
            searchMemberId ? [fromId, toId, searchMemberId] : [fromId, toId]
          );

          reportData = {
            loan_repayments: repayments.map((repayment) => ({
              member_number: repayment.member_number,
              first_name: repayment.first_name,
              last_name: repayment.last_name,
              loan_id: repayment.loan_id,
              amount: repayment.amount,
              principal_amount: repayment.principal_amount,
              interest_amount: repayment.interest_amount,
              payment_date: repayment.payment_date,
              status: repayment.status,
            })),
            message: "Loan repayment summary report generated successfully",
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

        switch (report_type) {
          case "member_financial_summary":
            headers = reportData.reportTable.headers;
            rows = reportData.reportTable.rows;
            break;
          case "loan_performance":
            headers = [
              "Member ID",
              "Name",
              "Loan ID",
              "Loan Amount",
              "Interest Rate",
              "Term",
              "Status",
              "Total Repaid",
              "Remaining Balance",
            ];
            rows = reportData.loans.map((loan) => [
              loan.member_id,
              `${loan.first_name} ${loan.last_name}`,
              loan.loan_id,
              loan.amount,
              loan.interest_rate,
              loan.term,
              loan.status,
              loan.total_repaid || 0,
              loan.remaining_balance || 0,
            ]);
            break;
          case "fee_collection":
            headers = [
              "Member ID",
              "Name",
              "Fee Type",
              "Amount",
              "Period",
              "Created At",
            ];
            rows = reportData.fees.map((fee) => [
              fee.member_id,
              `${fee.first_name} ${fee.last_name}`,
              fee.fee_type,
              fee.amount,
              fee.period_name,
              new Date(fee.created_at).toLocaleDateString(),
            ]);
            break;
          case "savings_shares_growth":
            headers = [
              "Member ID",
              "Name",
              "Period",
              "Savings",
              "Shares",
              "Total",
            ];
            rows = reportData.balances.map((balance) => [
              balance.member_id,
              `${balance.first_name} ${balance.last_name}`,
              balance.period_name,
              balance.savings,
              balance.shares,
              (parseFloat(balance.savings) || 0) +
                (parseFloat(balance.shares) || 0),
            ]);
            break;
          case "commodity_transactions":
            headers = [
              "Member ID",
              "Name",
              "Commodity Name",
              "Amount",
              "Total Repaid",
              "Remaining Balance",
              "Period",
            ];
            rows = reportData.commodities.map((commodity) => [
              commodity.member_id,
              `${commodity.first_name} ${commodity.last_name}`,
              commodity.name,
              commodity.amount,
              commodity.total_repaid || 0,
              (commodity.amount || 0) - (commodity.total_repaid || 0),
              commodity.period_name,
            ]);
            break;
          case "overdue_loans":
            headers = [
              "Member ID",
              "Name",
              "Loan ID",
              "Loan Amount",
              "Due Date",
              "Days Overdue",
              "Outstanding Balance",
            ];
            rows = reportData.loans.map((loan) => [
              loan.member_id,
              `${loan.first_name} ${loan.last_name}`,
              loan.loan_id,
              loan.amount,
              new Date(loan.due_date).toLocaleDateString(),
              loan.days_overdue,
              loan.outstanding_balance || 0,
            ]);
            break;
          case "interest_summary":
            headers = [
              "Total Interest Charged",
              "Total Interest Paid",
              "Total Unpaid Interest",
            ];
            rows = [
              [
                reportData.interest.total_interest_charged || 0,
                reportData.interest.total_interest_paid || 0,
                reportData.interest.total_unpaid_interest || 0,
              ],
            ];
            break;
          case "loan_repayment_summary":
            headers = [
              "Member ID",
              "Name",
              "Loan ID",
              "Amount",
              "Principal Amount",
              "Interest Amount",
              "Payment Date",
              "Status",
            ];
            rows = reportData.loan_repayments.map((repayment) => [
              repayment.member_number,
              `${repayment.first_name} ${repayment.last_name}`,
              repayment.loan_id,
              repayment.amount,
              repayment.principal_amount,
              repayment.interest_amount,
              new Date(repayment.payment_date).toLocaleDateString(),
              repayment.status,
            ]);
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

          rows.forEach((row) => {
            worksheet.addRow(row);
          });

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
            `attachment; filename=${reportTitle}.xlsx`
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
            `attachment; filename=${reportTitle}.pdf`
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

  // Update period status
  async updatePeriod(req, res) {
    const connection = await pool.getConnection();
    try {
      const { periodId } = req.params;
      const { status } = req.body;

      if (!status) return ResponseHandler.error(res, "Status required", 400);

      const [result] = await connection.execute(
        `UPDATE periods SET status = ? WHERE id = ?`,
        [status, periodId]
      );

      if (result.affectedRows === 0) {
        return ResponseHandler.error(
          res,
          `Period ID ${periodId} not found`,
          404
        );
      }

      ResponseHandler.success(res, null, "Period updated successfully");
    } catch (error) {
      console.error("Update period error:", error.message, error.stack);
      ResponseHandler.error(res, error.message || "Failed to update period");
    } finally {
      connection.release();
    }
  }

  // Helper function to insert notification
  async insertNotification(connection, userId, title, body) {
    if (!userId) {
      console.warn("Cannot insert notification: userId is missing");
      return;
    }
    try {
      await connection.execute(
        `INSERT INTO notifications (user_id, title, body, date) VALUES (?, ?, ?, NOW())`,
        [userId, title, body]
      );
    } catch (error) {
      console.error(
        `Failed to insert notification for user ${userId}:`,
        error.message
      );
    }
  }

  // Helper function to calculate balances
  async calculateBalances(connection, memberId, periodId) {
    const queries = {
      loan: `SELECT COALESCE(SUM(amount), 0) AS total FROM loans WHERE member_id = ? AND status = 'active'`,
      loanRepay: `SELECT COALESCE(SUM(amount), 0) AS total FROM loan_repayments WHERE member_id = ?`,
      commodity: `SELECT COALESCE(SUM(amount), 0) AS total FROM commodities WHERE member_id = ?`,
      commRepay: `SELECT COALESCE(SUM(amount), 0) AS total FROM commodity_repayments WHERE member_id = ?`,
      contri: `SELECT COALESCE(SUM(amount), 0) AS total FROM contributions WHERE member_id = ? AND period_id = ?`,
    };

    const balances = {};
    for (const [key, query] of Object.entries(queries)) {
      const params = key === "contri" ? [memberId, periodId] : [memberId];
      const [result] = await connection.execute(query, params);
      balances[key] = parseFloat(result[0].total);
    }

    balances.lnb = balances.loan - balances.loanRepay;
    balances.cnb = balances.commodity - balances.commRepay;
    return balances;
  }
}

module.exports = new PeriodController();
