const pool = require("../config/database");
const NotificationService = require("./notification");

class NotificationTasks {
  // Send reminders for loan repayments due in the next few days
  async sendLoanRepaymentReminders() {
    const connection = await pool.getConnection();
    try {
      console.log("Running loan repayment reminder task...");

      // Get repayments due in the next 3 days
      const [upcomingRepayments] = await connection.execute(
        `SELECT 
           lr.*, l.member_id, l.amount as loan_amount,
           m.first_name, m.last_name,
           u.id as user_id, u.email
         FROM loan_repayments lr
         JOIN loans l ON lr.loan_id = l.id
         JOIN members m ON l.member_id = m.id
         JOIN users u ON m.user_id = u.id
         WHERE lr.status = 'pending'
         AND lr.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
      );

      console.log(`Found ${upcomingRepayments.length} upcoming repayments`);

      // Send reminder for each upcoming repayment
      for (const repayment of upcomingRepayments) {
        await NotificationService.notify(
          repayment.user_id,
          "loan_repayment_reminder",
          {
            memberName: `${repayment.first_name} ${repayment.last_name}`,
            amount: repayment.amount.toFixed(2),
            dueDate: new Date(repayment.due_date).toLocaleDateString(),
            loanAmount: repayment.loan_amount.toFixed(2),
          }
        );
      }

      return {
        processed: upcomingRepayments.length,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Repayment reminder error:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Send monthly statements to all active members
  // Add this method to the NotificationTasks class in utils/notification-tasks.js

  async sendMonthlyStatements() {
    const connection = await pool.getConnection();
    try {
      console.log("Running monthly statement notification task...");

      // Get all active members
      const [activeMembers] = await connection.execute(
        `SELECT m.*, u.id as user_id, u.email
       FROM members m
       JOIN users u ON m.user_id = u.id
       WHERE m.membership_status = 'active'`
      );

      // Get current period
      const [currentPeriod] = await connection.execute(
        `SELECT * FROM periods 
       ORDER BY year DESC, month DESC 
       LIMIT 1`
      );

      if (currentPeriod.length === 0) {
        throw new Error("No period found");
      }

      console.log(
        `Found ${activeMembers.length} active members for period ${currentPeriod[0].month}/${currentPeriod[0].year}`
      );

      // Send statement notification to each member
      let successCount = 0;
      for (const member of activeMembers) {
        try {
          // Get member total contributions for current period
          const [contributions] = await connection.execute(
            `SELECT SUM(total_amount) as period_total
           FROM contributions
           WHERE member_id = ? AND period_id = ?`,
            [member.id, currentPeriod[0].id]
          );

          // Get member balances
          const [balances] = await connection.execute(
            `SELECT * FROM member_balances
           WHERE member_id = ?`,
            [member.id]
          );

          await NotificationService.notify(
            member.user_id,
            "monthly_statement",
            {
              memberName: `${member.first_name} ${member.last_name}`,
              periodMonth: currentPeriod[0].month,
              periodYear: currentPeriod[0].year,
              periodContributions:
                contributions[0].period_total?.toFixed(2) || "0.00",
              totalShares: balances[0]?.total_shares?.toFixed(2) || "0.00",
              totalSavings: balances[0]?.total_savings?.toFixed(2) || "0.00",
            }
          );

          successCount++;
        } catch (memberError) {
          console.error(
            `Error sending statement to member ${member.id}:`,
            memberError
          );
        }
      }

      return {
        total: activeMembers.length,
        successful: successCount,
        period: `${currentPeriod[0].month}/${currentPeriod[0].year}`,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Monthly statement notification error:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new NotificationTasks();
