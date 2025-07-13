const pool = require("../config/database");
const ResponseHandler = require("../utils/response");
const bcrypt = require("bcryptjs");

class MemberController {
  async registerMember(req, res) {
    const connection = await pool.getConnection();
    try {
      const {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        address,
        phoneNumber,
        idType,
        idNumber,
        employmentStatus,
        email,
        nextOfKin,
      } = req.body;

      await connection.beginTransaction();

      // Generate username (e.g., firstName.lastName + random number)
      const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      const [existingUsers] = await connection.execute(
        "SELECT username FROM users WHERE username LIKE ?",
        [`${baseUsername}%`]
      );
      const usernameSuffix =
        existingUsers.length > 0 ? existingUsers.length + 1 : "";
      const username = `${baseUsername}${usernameSuffix}`;

      // Check for duplicate email before attempting insert
      const [existingEmail] = await connection.execute(
        "SELECT email FROM users WHERE email = ?",
        [email]
      );
      if (existingEmail.length > 0) {
        throw new Error(
          "This email is already registered. Please use a different email."
        );
      }

      // Generate default password and hash it
      const defaultPassword = "Welcome123!";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Create user account
      const [userResult] = await connection.execute(
        `INSERT INTO users (username, email, password, role, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, "member", 1]
      );
      const userId = userResult.insertId;

      // Generate unique member_id
      const [lastMember] = await connection.execute(
        "SELECT member_id FROM members ORDER BY id DESC LIMIT 1"
      );
      const nextNumber =
        lastMember.length > 0
          ? parseInt(lastMember[0].member_id.slice(3)) + 1
          : 1;
      const memberId = `MEM${String(nextNumber).padStart(6, "0")}`;

      // Insert member with linked user_id
      const [memberResult] = await connection.execute(
        `INSERT INTO members (
          user_id, member_id, first_name, last_name,
          date_of_birth, gender, address, phone_number,
          id_type, id_number, employment_status, membership_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
        [
          userId,
          memberId,
          firstName,
          lastName,
          dateOfBirth,
          gender,
          address,
          phoneNumber,
          idType,
          idNumber,
          employmentStatus,
        ]
      );

      // Insert next of kin
      await connection.execute(
        `INSERT INTO next_of_kin (
          member_id, first_name, last_name,
          relationship, phone_number, address
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          memberResult.insertId,
          nextOfKin.firstName,
          nextOfKin.lastName,
          nextOfKin.relationship,
          nextOfKin.phoneNumber,
          nextOfKin.address,
        ]
      );

      // Insert member balance
      // await connection.execute(
      //   `INSERT INTO member_balances (member_id) VALUES (?)`,
      //   [memberResult.insertId]
      // );

      await connection.commit();

      ResponseHandler.success(
        res,
        { memberId, username, email },
        "Member registered successfully! Username: " + username,
        201
      );
    } catch (error) {
      await connection.rollback();
      console.error("Member registration error:", error);
      // Provide specific message for duplicate email or generic error
      const errorMessage =
        error.message ===
        "This email is already registered. Please use a different email."
          ? error.message
          : "Failed to register member. Please try again.";
      ResponseHandler.error(
        res,
        errorMessage,
        error.message ===
          "This email is already registered. Please use a different email."
          ? 400
          : 500
      );
    } finally {
      connection.release();
    }
  }

  // Other methods remain unchanged for brevity
  async getMemberBankDetails(req, res) {
    const connection = await pool.getConnection();
    try {
      const { memberId } = req.params;
      const [details] = await connection.execute(
        `SELECT id, bank_name, sortcode, account_number, account_name 
         FROM member_bank_details WHERE member_id = ?`,
        [memberId]
      );
      ResponseHandler.success(
        res,
        details,
        "Bank details retrieved successfully"
      );
    } catch (error) {
      console.error("Get member bank details error:", error);
      ResponseHandler.error(res, "Failed to fetch bank details");
    } finally {
      connection.release();
    }
  }

  async upsertMemberBankDetails(req, res) {
    const connection = await pool.getConnection();
    try {
      const { memberId, bankName, sortcode, accountNumber, accountName } =
        req.body;

      if (!memberId || !bankName || !sortcode || !accountNumber) {
        return ResponseHandler.error(
          res,
          "All required fields (memberId, bankName, sortcode, accountNumber) must be provided",
          400
        );
      }

      await connection.beginTransaction();

      const [memberCheck] = await connection.execute(
        `SELECT id FROM members WHERE id = ?`,
        [memberId]
      );
      if (memberCheck.length === 0) {
        return ResponseHandler.error(
          res,
          `Member ID ${memberId} not found`,
          404
        );
      }

      const [sortcodeCheck] = await connection.execute(
        `SELECT Bank_Name FROM bank_sortcodes WHERE bank_code = ?`,
        [sortcode]
      );
      if (sortcodeCheck.length === 0) {
        return ResponseHandler.error(
          res,
          `Sortcode ${sortcode} not found`,
          400
        );
      }

      const [existing] = await connection.execute(
        `SELECT id FROM member_bank_details WHERE member_id = ?`,
        [memberId]
      );

      if (existing.length > 0) {
        await connection.execute(
          `UPDATE member_bank_details 
           SET bank_name = ?, sortcode = ?, account_number = ?, account_name = ?, updated_at = NOW()
           WHERE member_id = ?`,
          [bankName, sortcode, accountNumber, accountName || null, memberId]
        );
        ResponseHandler.success(res, null, "Bank details updated successfully");
      } else {
        await connection.execute(
          `INSERT INTO member_bank_details (member_id, bank_name, sortcode, account_number, account_name)
           VALUES (?, ?, ?, ?, ?)`,
          [memberId, bankName, sortcode, accountNumber, accountName || null]
        );
        ResponseHandler.success(
          res,
          null,
          "Bank details added successfully",
          201
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("Upsert member bank details error:", error);
      ResponseHandler.error(res, "Failed to save bank details");
    } finally {
      connection.release();
    }
  }

  async listBankSortCodes(req, res) {
    const connection = await pool.getConnection();
    try {
      console.log("Fetching bank sort codes...");
      const [banks] = await connection.execute(
        `SELECT Bank_Name AS bank_name, bank_code AS sortcode FROM bank_sortcodes ORDER BY Bank_Name`
      );
      console.log("Bank sort codes fetched:", banks);
      ResponseHandler.success(
        res,
        banks,
        "Bank sort codes retrieved successfully"
      );
    } catch (error) {
      console.error("List bank sort codes error:", error);
      ResponseHandler.error(res, "Failed to fetch bank sort codes");
    } finally {
      connection.release();
    }
  }

  async listMembers(req, res) {
    const connection = await pool.getConnection();
    try {
      const [members] = await connection.execute(
        `SELECT 
          m.id, 
          m.member_id, 
          m.first_name, 
          m.last_name, 
          m.phone_number,
          COALESCE(SUM(COALESCE(mb.shares, 0) + COALESCE(mb.savings, 0)), 0) AS total_savings,
          COALESCE((
            SELECT SUM(COALESCE(l.amount, 0))
            FROM loans l
            WHERE l.member_id = m.id AND l.status = 'active'
          ), 0) - COALESCE((
            SELECT SUM(COALESCE(lr.amount, 0))
            FROM loan_repayments lr
            WHERE lr.member_id = m.id
            AND lr.loan_id IN (
              SELECT id FROM loans WHERE member_id = m.id AND status = 'active'
            )
          ), 0) AS loan_balance,
          COALESCE((
            SELECT COUNT(id)
            FROM loans l
            WHERE l.member_id = m.id AND l.status = 'active'
          ), 0) AS active_loan_count
        FROM members m
        LEFT JOIN member_balances mb ON m.id = mb.member_id
        GROUP BY m.id, m.member_id, m.first_name, m.last_name, m.phone_number`
      );

      const formattedMembers = members.map((member) => {
        const savings = parseFloat(member.total_savings || 0).toFixed(2);
        const balance = parseFloat(member.loan_balance || 0).toFixed(2);
        return {
          ...member,
          total_savings: parseFloat(savings),
          loan_balance: parseFloat(balance),
          active_loan_count: member.active_loan_count,
        };
      });

      ResponseHandler.success(
        res,
        formattedMembers,
        "Members retrieved successfully"
      );
    } catch (error) {
      console.error("List members error:", error);
      ResponseHandler.error(res, "Failed to fetch members");
    } finally {
      connection.release();
    }
  }

  async getMemberDetails(req, res) {
    const connection = await pool.getConnection();
    try {
      const [members] = await connection.execute(
        `SELECT m.*, 
              u.email, 
              u.username,
              nok.first_name AS next_of_kin_first_name,
              nok.last_name AS next_of_kin_last_name,
              nok.relationship AS next_of_kin_relationship,
              nok.phone_number AS next_of_kin_phone_number,
              nok.address AS next_of_kin_address
       FROM members m
       LEFT JOIN users u ON m.user_id = u.id
       LEFT JOIN next_of_kin nok ON m.id = nok.member_id
       WHERE m.id = ?`,
        [req.params.id]
      );

      if (members.length === 0) {
        return ResponseHandler.error(res, "Member not found", 404);
      }

      ResponseHandler.success(
        res,
        members[0],
        "Member details retrieved successfully"
      );
    } catch (error) {
      console.error("Get member details error:", error);
      ResponseHandler.error(res, "Failed to fetch member details");
    } finally {
      connection.release();
    }
  }

  async updateMemberSettings(req, res) {
    const connection = await pool.getConnection();
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const {
        allow_savings_with_loan,
        savings_with_loan_amount,
        stop_loan_interest,
      } = req.body;

      // Check if member exists
      const [rows] = await connection.execute(
        "SELECT id FROM members WHERE id = ?",
        [memberId]
      );
      if (rows.length === 0) {
        return ResponseHandler.error(res, "Member not found", 404);
      }

      // Build update fields and values
      const updateFields = [];
      const updateValues = [];

      if (typeof allow_savings_with_loan !== "undefined") {
        if (typeof allow_savings_with_loan !== "boolean") {
          return ResponseHandler.error(
            res,
            "allow_savings_with_loan must be a boolean.",
            400
          );
        }
        updateFields.push("allow_savings_with_loan = ?");
        updateValues.push(allow_savings_with_loan);
      }
      if (typeof savings_with_loan_amount !== "undefined") {
        if (
          typeof savings_with_loan_amount !== "number" ||
          isNaN(savings_with_loan_amount)
        ) {
          return ResponseHandler.error(
            res,
            "savings_with_loan_amount must be a number.",
            400
          );
        }
        if (savings_with_loan_amount < 0) {
          return ResponseHandler.error(
            res,
            "savings_with_loan_amount must be positive.",
            400
          );
        }
        updateFields.push("savings_with_loan_amount = ?");
        updateValues.push(savings_with_loan_amount);
      }
      if (typeof stop_loan_interest !== "undefined") {
        if (typeof stop_loan_interest !== "boolean") {
          return ResponseHandler.error(
            res,
            "stop_loan_interest must be a boolean.",
            400
          );
        }
        updateFields.push("stop_loan_interest = ?");
        updateValues.push(stop_loan_interest);
      }

      if (updateFields.length === 0) {
        return ResponseHandler.error(res, "No valid fields to update.", 400);
      }

      updateFields.push("updated_at = NOW()");

      await connection.execute(
        `UPDATE members SET ${updateFields.join(", ")} WHERE id = ?`,
        [...updateValues, memberId]
      );

      ResponseHandler.success(
        res,
        null,
        `Settings for member ID ${memberId} updated successfully`,
        200
      );
    } catch (error) {
      console.error(
        "Update member settings error:",
        error.message,
        error.stack
      );
      ResponseHandler.error(res, error.message || "Failed to update settings");
    } finally {
      connection.release();
    }
  }

  async getMemberSettings(req, res) {
    const connection = await pool.getConnection();
    try {
      const memberId = parseInt(req.params.memberId, 10);

      // Check if member exists
      const [rows] = await connection.execute(
        "SELECT id, allow_savings_with_loan, savings_with_loan_amount, stop_loan_interest FROM members WHERE id = ?",
        [memberId]
      );
      if (rows.length === 0) {
        return ResponseHandler.error(res, "Member not found", 404);
      }

      const member = rows[0];
      const settings = {
        allow_savings_with_loan: member.allow_savings_with_loan || false,
        savings_with_loan_amount: member.savings_with_loan_amount || 0.0,
        stop_loan_interest: member.stop_loan_interest || false,
      };

      ResponseHandler.success(
        res,
        settings,
        `Settings for member ID ${memberId} retrieved successfully`,
        200
      );
    } catch (error) {
      console.error("Get member settings error:", error.message, error.stack);
      ResponseHandler.error(
        res,
        error.message || "Failed to retrieve settings"
      );
    } finally {
      connection.release();
    }
  }

  async getMemberBalance(req, res) {
    const connection = await pool.getConnection();
    try {
      const [balances] = await connection.execute(
        `SELECT * FROM member_balances WHERE member_id = ?`,
        [req.params.id]
      );

      if (balances.length === 0) {
        return ResponseHandler.error(res, "Member balance not found", 404);
      }

      ResponseHandler.success(
        res,
        balances[0],
        "Member balance retrieved successfully"
      );
    } catch (error) {
      console.error("Get member balance error:", error);
      ResponseHandler.error(res, "Failed to fetch member balance");
    } finally {
      connection.release();
    }
  }

  async updateMember(req, res) {
    const connection = await pool.getConnection();
    try {
      const {
        firstName,
        lastName,
        address,
        phoneNumber,
        employmentStatus,
        nextOfKin,
      } = req.body;

      await connection.beginTransaction();

      await connection.execute(
        `UPDATE members 
                SET first_name = ?, last_name = ?, address = ?,
                    phone_number = ?, employment_status = ?
                WHERE id = ?`,
        [
          firstName,
          lastName,
          address,
          phoneNumber,
          employmentStatus,
          req.params.id,
        ]
      );

      if (nextOfKin) {
        await connection.execute(
          `UPDATE next_of_kin 
                    SET first_name = ?, last_name = ?, relationship = ?,
                        phone_number = ?, address = ?
                    WHERE member_id = ?`,
          [
            nextOfKin.firstName,
            nextOfKin.lastName,
            nextOfKin.relationship,
            nextOfKin.phoneNumber,
            nextOfKin.address,
            req.params.id,
          ]
        );
      }

      await connection.commit();

      ResponseHandler.success(res, null, "Member updated successfully");
    } catch (error) {
      await connection.rollback();
      console.error("Update member error:", error);
      ResponseHandler.error(res, "Failed to update member");
    } finally {
      connection.release();
    }
  }

  async withdrawFromBalance(req, res) {
    const connection = await pool.getConnection();
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const { period_id, type, amount } = req.body;
      if (!memberId || !period_id || !type || !amount) {
        return ResponseHandler.error(res, "All fields are required.", 400);
      }
      if (!["shares", "savings"].includes(type)) {
        return ResponseHandler.error(
          res,
          "Type must be 'shares' or 'savings'.",
          400
        );
      }
      if (amount <= 0) {
        return ResponseHandler.error(res, "Amount must be positive.", 400);
      }
      // Check member and period
      const [[member]] = await connection.query(
        "SELECT id FROM members WHERE id = ?",
        [memberId]
      );
      if (!member) return ResponseHandler.error(res, "Member not found", 404);
      const [[period]] = await connection.query(
        "SELECT id FROM periods WHERE id = ?",
        [period_id]
      );
      if (!period) return ResponseHandler.error(res, "Period not found", 404);

      // Get cumulative balance across all periods
      const [[cumulativeBalance]] = await connection.query(
        `SELECT 
          COALESCE(SUM(shares), 0) as total_shares, 
          COALESCE(SUM(savings), 0) as total_savings 
          FROM member_balances WHERE member_id = ?`,
        [memberId]
      );

      if (parseFloat(cumulativeBalance[type]) < amount) {
        return ResponseHandler.error(res, `Insufficient ${type} balance.`, 400);
      }

      // Get all balance records for this member, ordered by period_id
      const [balanceRecords] = await connection.query(
        `SELECT id, period_id, shares, savings FROM member_balances WHERE member_id = ? ORDER BY period_id ASC`,
        [memberId]
      );

      if (balanceRecords.length === 0) {
        return ResponseHandler.error(
          res,
          "No balance records found for this member.",
          404
        );
      }

      await connection.beginTransaction();

      // Distribute withdrawal across periods (FIFO - First In, First Out)
      let remainingAmount = amount;
      let updatedBalances = [];

      for (const record of balanceRecords) {
        if (remainingAmount <= 0) break;

        const currentBalance = parseFloat(record[type]) || 0;
        if (currentBalance <= 0) continue;

        const withdrawalFromThisPeriod = Math.min(
          remainingAmount,
          currentBalance
        );
        const newBalance = currentBalance - withdrawalFromThisPeriod;

        // Update this period's balance
        await connection.query(
          `UPDATE member_balances SET ${type} = ? WHERE id = ?`,
          [newBalance, record.id]
        );

        remainingAmount -= withdrawalFromThisPeriod;
        updatedBalances.push({
          period_id: record.period_id,
          withdrawn: withdrawalFromThisPeriod,
          remaining: newBalance,
        });
      }

      if (remainingAmount > 0) {
        throw new Error(`Insufficient ${type} balance across all periods`);
      }

      // Insert withdrawal record
      await connection.query(
        `INSERT INTO withdrawals (member_id, period_id, type, amount) VALUES (?, ?, ?, ?)`,
        [memberId, period_id, type, amount]
      );

      await connection.commit();

      // Get updated cumulative balances
      const [[updatedCumulative]] = await connection.query(
        `SELECT 
          COALESCE(SUM(shares), 0) as total_shares, 
          COALESCE(SUM(savings), 0) as total_savings 
          FROM member_balances WHERE member_id = ?`,
        [memberId]
      );

      ResponseHandler.success(
        res,
        updatedCumulative,
        `Withdrawal successful.`,
        200
      );
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Withdraw error:", error);
      ResponseHandler.error(res, error.message || "Failed to withdraw");
    } finally {
      connection.release();
    }
  }
}

module.exports = new MemberController();
