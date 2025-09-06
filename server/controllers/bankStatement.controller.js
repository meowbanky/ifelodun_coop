const pool = require("../config/database");
const ResponseHandler = require("../utils/response");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");
const stringSimilarity = require("string-similarity");

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Standalone function for file type detection
function getFileTypeFromMimeType(mimetype) {
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype.includes("excel") || mimetype.includes("spreadsheet"))
    return "excel";
  if (mimetype.includes("image")) return "image";
  return "unknown";
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/bank-statements");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for shared hosting
    files: 5, // Limit to 5 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, Excel, and image files are allowed."
        )
      );
    }
  },
});

class BankStatementController {
  // Upload bank statement files
  async uploadBankStatement(req, res) {
    const uploadMiddleware = upload.array("files", 5); // Allow up to 5 files for shared hosting

    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return ResponseHandler.error(res, err.message, 400);
      }

      if (!req.files || req.files.length === 0) {
        return ResponseHandler.error(res, "No files uploaded", 400);
      }

      const connection = await pool.getConnection();
      try {
        const uploadedFiles = [];

        for (const file of req.files) {
          // Use a simple function to determine file type instead of calling the method
          const fileType = getFileTypeFromMimeType(file.mimetype);

          const [result] = await connection.execute(
            `INSERT INTO bank_statements (filename, file_path, file_type, uploaded_by) 
             VALUES (?, ?, ?, ?)`,
            [file.originalname, file.path, fileType, req.user.id]
          );

          uploadedFiles.push({
            id: result.insertId,
            filename: file.originalname,
            fileType: fileType,
            status: "uploaded",
          });
        }

        ResponseHandler.success(
          res,
          uploadedFiles,
          "Bank statements uploaded successfully"
        );
      } catch (error) {
        console.error("Upload error:", error);
        ResponseHandler.error(res, "Failed to upload bank statements");
      } finally {
        connection.release();
      }
    });
  }

  // Extract data from uploaded files
  async extractData(req, res) {
    const { bankStatementIds } = req.body;
    const controller = this; // Store reference to controller instance

    if (!bankStatementIds || !Array.isArray(bankStatementIds)) {
      return ResponseHandler.error(res, "Bank statement IDs are required", 400);
    }

    const connection = await pool.getConnection();
    try {
      const extractedData = [];

      for (const statementId of bankStatementIds) {
        // Get bank statement details
        const [statements] = await connection.execute(
          "SELECT * FROM bank_statements WHERE id = ?",
          [statementId]
        );

        if (statements.length === 0) {
          continue;
        }

        const statement = statements[0];

        // Update status to processing
        await connection.execute(
          "UPDATE bank_statements SET status = 'processing' WHERE id = ?",
          [statementId]
        );

        let transactions = [];

        try {
          // Extract data based on file type
          if (statement.file_type === "excel") {
            transactions = await controller.extractFromExcel(
              statement.file_path
            );
          } else if (statement.file_type === "pdf") {
            transactions = await controller.extractFromPDF(statement.file_path);
          } else if (statement.file_type === "image") {
            transactions = await controller.extractFromImage(
              statement.file_path
            );
          }

          // Store extracted transactions
          for (const transaction of transactions) {
            await connection.execute(
              `INSERT INTO extracted_transactions 
               (bank_statement_id, account_holder_name, transaction_date, amount, 
                transaction_type, description, account_number, confidence_score) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                statementId,
                transaction.accountHolderName,
                transaction.transactionDate,
                transaction.amount,
                transaction.transactionType,
                transaction.description,
                transaction.accountNumber,
                transaction.confidenceScore || 0,
              ]
            );
          }

          // Update status to completed
          await connection.execute(
            "UPDATE bank_statements SET status = 'completed' WHERE id = ?",
            [statementId]
          );

          extractedData.push({
            statementId,
            filename: statement.filename,
            transactionsCount: transactions.length,
            status: "completed",
          });
        } catch (error) {
          console.error(`Error processing statement ${statementId}:`, error);

          // Update status to failed
          await connection.execute(
            "UPDATE bank_statements SET status = 'failed' WHERE id = ?",
            [statementId]
          );

          extractedData.push({
            statementId,
            filename: statement.filename,
            error: error.message,
            status: "failed",
          });
        }
      }

      ResponseHandler.success(res, extractedData, "Data extraction completed");
    } catch (error) {
      console.error("Extraction error:", error);
      ResponseHandler.error(res, "Failed to extract data");
    } finally {
      connection.release();
    }
  }

  // Match extracted names with members
  async matchNames(req, res) {
    const { confidenceThreshold = 0.7 } = req.body;
    const controller = this; // Store reference to controller instance

    const connection = await pool.getConnection();
    try {
      // Get all unmatched transactions
      const [transactions] = await connection.execute(
        "SELECT * FROM extracted_transactions WHERE status = 'extracted'"
      );

      // Get all members for matching
      const [members] = await connection.execute(
        "SELECT id, first_name, middle_name, last_name FROM members WHERE membership_status = 'active'"
      );

      const matchingResults = [];

      for (const transaction of transactions) {
        const bestMatch = controller.findBestNameMatch(
          transaction.account_holder_name,
          members,
          confidenceThreshold
        );

        if (bestMatch) {
          // Update transaction with matched member
          await connection.execute(
            "UPDATE extracted_transactions SET matched_member_id = ?, status = 'matched' WHERE id = ?",
            [bestMatch.memberId, transaction.id]
          );

          matchingResults.push({
            transactionId: transaction.id,
            accountHolderName: transaction.account_holder_name,
            matchedMemberId: bestMatch.memberId,
            matchedMemberName: bestMatch.memberName,
            confidenceScore: bestMatch.confidence,
          });
        } else {
          // Mark as unmatched
          await connection.execute(
            "UPDATE extracted_transactions SET status = 'unmatched' WHERE id = ?",
            [transaction.id]
          );

          matchingResults.push({
            transactionId: transaction.id,
            accountHolderName: transaction.account_holder_name,
            status: "unmatched",
          });
        }
      }

      ResponseHandler.success(res, matchingResults, "Name matching completed");
    } catch (error) {
      console.error("Name matching error:", error);
      ResponseHandler.error(res, "Failed to match names");
    } finally {
      connection.release();
    }
  }

  // Process matched transactions
  async processTransactions(req, res) {
    const { periodId, bankStatementIds } = req.body;

    if (!periodId) {
      return ResponseHandler.error(res, "Period ID is required", 400);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get matched transactions
      const [transactions] = await connection.execute(
        `SELECT et.*, bs.filename 
         FROM extracted_transactions et 
         JOIN bank_statements bs ON et.bank_statement_id = bs.id 
         WHERE et.status = 'matched' AND et.matched_member_id IS NOT NULL`
      );

      let processedCount = 0;
      let unmatchedCount = 0;

      for (const transaction of transactions) {
        try {
          if (transaction.transaction_type === "credit") {
            // Insert as contribution
            await connection.execute(
              `INSERT INTO contributions (member_id, period_id, amount, created_at, created_by) 
               VALUES (?, ?, ?, NOW(), ?)`,
              [
                transaction.matched_member_id,
                periodId,
                transaction.amount,
                req.user.id,
              ]
            );
          } else if (transaction.transaction_type === "debit") {
            // Insert as loan
            await connection.execute(
              `INSERT INTO loans (
                member_id, period_id, loan_type_id, amount, interest_rate, 
                grant_date, term, application_date, status, created_at
              ) VALUES (?, ?, 1, ?, 0.015, ?, 12, ?, 'pending', NOW())`,
              [
                transaction.matched_member_id,
                periodId,
                transaction.amount,
                transaction.transaction_date,
                transaction.transaction_date,
              ]
            );
          }

          // Mark as processed
          await connection.execute(
            "UPDATE extracted_transactions SET status = 'processed' WHERE id = ?",
            [transaction.id]
          );

          processedCount++;
        } catch (error) {
          console.error(
            `Error processing transaction ${transaction.id}:`,
            error
          );
          unmatchedCount++;
        }
      }

      // Create processing log
      await connection.execute(
        `INSERT INTO statement_processing_logs 
         (bank_statement_id, period_id, processed_by, total_transactions, 
          matched_transactions, unmatched_transactions, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'completed')`,
        [
          bankStatementIds?.[0] || null,
          periodId,
          req.user.id,
          transactions.length,
          processedCount,
          unmatchedCount,
        ]
      );

      await connection.commit();

      ResponseHandler.success(
        res,
        {
          processedCount,
          unmatchedCount,
          totalCount: transactions.length,
        },
        "Transactions processed successfully"
      );
    } catch (error) {
      await connection.rollback();
      console.error("Processing error:", error);
      ResponseHandler.error(res, "Failed to process transactions");
    } finally {
      connection.release();
    }
  }

  // Get extracted transactions for review
  async getExtractedTransactions(req, res) {
    const connection = await pool.getConnection();
    try {
      const [transactions] = await connection.execute(
        `SELECT et.*, bs.filename, m.first_name, m.last_name, m.member_id as member_code
         FROM extracted_transactions et 
         JOIN bank_statements bs ON et.bank_statement_id = bs.id 
         LEFT JOIN members m ON et.matched_member_id = m.id 
         ORDER BY et.created_at DESC`
      );

      ResponseHandler.success(
        res,
        transactions,
        "Extracted transactions retrieved successfully"
      );
    } catch (error) {
      console.error("Get transactions error:", error);
      ResponseHandler.error(res, "Failed to retrieve transactions");
    } finally {
      connection.release();
    }
  }

  // Get unmatched transactions for export
  async getUnmatchedTransactions(req, res) {
    const connection = await pool.getConnection();
    try {
      const [transactions] = await connection.execute(
        `SELECT et.*, bs.filename 
         FROM extracted_transactions et 
         JOIN bank_statements bs ON et.bank_statement_id = bs.id 
         WHERE et.status = 'unmatched' 
         ORDER BY et.created_at DESC`
      );

      ResponseHandler.success(
        res,
        transactions,
        "Unmatched transactions retrieved successfully"
      );
    } catch (error) {
      console.error("Get unmatched transactions error:", error);
      ResponseHandler.error(res, "Failed to retrieve unmatched transactions");
    } finally {
      connection.release();
    }
  }

  // Manual transaction editing
  async editTransaction(req, res) {
    const { transactionId } = req.params;
    const {
      accountHolderName,
      transactionDate,
      amount,
      transactionType,
      description,
      accountNumber,
      matchedMemberId,
    } = req.body;

    const connection = await pool.getConnection();
    try {
      // Validate required fields
      if (
        !accountHolderName ||
        !transactionDate ||
        !amount ||
        !transactionType
      ) {
        return ResponseHandler.error(res, "Missing required fields", 400);
      }

      // Update transaction
      await connection.execute(
        `UPDATE extracted_transactions 
         SET account_holder_name = ?, transaction_date = ?, amount = ?, 
             transaction_type = ?, description = ?, account_number = ?, 
             matched_member_id = ?, status = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          accountHolderName,
          transactionDate,
          amount,
          transactionType,
          description || "",
          accountNumber || "",
          matchedMemberId || null,
          matchedMemberId ? "matched" : "extracted",
          transactionId,
        ]
      );

      ResponseHandler.success(res, null, "Transaction updated successfully");
    } catch (error) {
      console.error("Edit transaction error:", error);
      ResponseHandler.error(res, "Failed to update transaction");
    } finally {
      connection.release();
    }
  }

  // Delete transaction
  async deleteTransaction(req, res) {
    const { transactionId } = req.params;

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        "DELETE FROM extracted_transactions WHERE id = ?",
        [transactionId]
      );

      ResponseHandler.success(res, null, "Transaction deleted successfully");
    } catch (error) {
      console.error("Delete transaction error:", error);
      ResponseHandler.error(res, "Failed to delete transaction");
    } finally {
      connection.release();
    }
  }

  // Get processing statistics
  async getProcessingStats(req, res) {
    const connection = await pool.getConnection();
    try {
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as matched_transactions,
          SUM(CASE WHEN status = 'unmatched' THEN 1 ELSE 0 END) as unmatched_transactions,
          SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as processed_transactions,
          SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) as total_credits,
          SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) as total_debits
        FROM extracted_transactions
      `);

      ResponseHandler.success(
        res,
        stats[0],
        "Statistics retrieved successfully"
      );
    } catch (error) {
      console.error("Get stats error:", error);
      ResponseHandler.error(res, "Failed to retrieve statistics");
    } finally {
      connection.release();
    }
  }

  // Helper methods
  getFileType(mimetype) {
    if (mimetype === "application/pdf") return "pdf";
    if (mimetype.includes("excel") || mimetype.includes("spreadsheet"))
      return "excel";
    if (mimetype.includes("image")) return "image";
    return "unknown";
  }

  async extractFromExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return data.map((row) => ({
      accountHolderName:
        row["Account Holder"] || row["Name"] || row["Account Name"] || "",
      transactionDate: row["Date"] || row["Transaction Date"] || new Date(),
      amount: parseFloat(row["Amount"] || row["Credit"] || row["Debit"] || 0),
      transactionType: row["Type"] || (row["Credit"] ? "credit" : "debit"),
      description: row["Description"] || row["Narration"] || "",
      accountNumber: row["Account Number"] || "",
      confidenceScore: 0.9,
    }));
  }

  async extractFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    // Use OpenAI to extract structured data from PDF text
    const prompt = `Extract transaction data from this bank statement text. Return as JSON array with fields: accountHolderName, transactionDate (YYYY-MM-DD format), amount (number), transactionType (credit/debit), description, accountNumber. Only extract clear transactions. If no transactions found, return empty array.

Text: ${data.text.substring(0, 4000)}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const response = completion.choices[0].message.content;

      // Clean and parse the response
      let transactions = [];
      try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\[.*\]/s);
        if (jsonMatch) {
          transactions = JSON.parse(jsonMatch[0]);
        } else {
          transactions = JSON.parse(response);
        }
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", parseError);
        return [];
      }

      // Validate and clean transactions
      return transactions
        .filter((t) => t && typeof t === "object")
        .map((t) => ({
          accountHolderName: t.accountHolderName || t.account_holder_name || "",
          transactionDate:
            t.transactionDate ||
            t.transaction_date ||
            new Date().toISOString().split("T")[0],
          amount: parseFloat(t.amount) || 0,
          transactionType: (
            t.transactionType ||
            t.transaction_type ||
            "credit"
          ).toLowerCase(),
          description: t.description || "",
          accountNumber: t.accountNumber || t.account_number || "",
          confidenceScore: 0.8,
        }))
        .filter((t) => t.amount > 0); // Only include transactions with valid amounts
    } catch (error) {
      console.error("OpenAI extraction error:", error);
      return [];
    }
  }

  async extractFromImage(filePath) {
    // Use OpenAI Vision API for image processing
    const controller = this; // Store reference to controller instance

    try {
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString("base64");

      const completion = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract transaction data from this bank statement image. Return as JSON array with fields: accountHolderName, transactionDate (YYYY-MM-DD format), amount (number), transactionType (credit/debit), description, accountNumber. Only extract clear transactions. If no transactions found, return empty array.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      });

      const response = completion.choices[0].message.content;

      // Clean and parse the response
      let transactions = [];
      try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\[.*\]/s);
        if (jsonMatch) {
          transactions = JSON.parse(jsonMatch[0]);
        } else {
          transactions = JSON.parse(response);
        }
      } catch (parseError) {
        console.error("Failed to parse OpenAI Vision response:", parseError);
        return [];
      }

      // Validate and clean transactions
      return transactions
        .filter((t) => t && typeof t === "object")
        .map((t) => ({
          accountHolderName: t.accountHolderName || t.account_holder_name || "",
          transactionDate:
            t.transactionDate ||
            t.transaction_date ||
            new Date().toISOString().split("T")[0],
          amount: parseFloat(t.amount) || 0,
          transactionType: (
            t.transactionType ||
            t.transaction_type ||
            "credit"
          ).toLowerCase(),
          description: t.description || "",
          accountNumber: t.accountNumber || t.account_number || "",
          confidenceScore: 0.7, // Slightly lower confidence for image extraction
        }))
        .filter((t) => t.amount > 0); // Only include transactions with valid amounts
    } catch (error) {
      console.error("OpenAI Vision extraction error:", error);

      // Fallback: Try to extract using OCR or return empty array
      console.log("Falling back to basic image processing...");
      return controller.extractFromImageFallback(filePath);
    }
  }

  // Fallback method for image processing without OpenAI Vision
  async extractFromImageFallback(filePath) {
    try {
      // For now, return empty array as fallback
      // In a production environment, you could integrate with:
      // - Tesseract.js for OCR
      // - Google Cloud Vision API
      // - Azure Computer Vision
      // - AWS Textract

      console.log("Image processing fallback: No transactions extracted");
      return [];
    } catch (error) {
      console.error("Image fallback processing error:", error);
      return [];
    }
  }

  findBestNameMatch(accountHolderName, members, threshold) {
    let bestMatch = null;
    let bestScore = 0;

    for (const member of members) {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      const accountName = accountHolderName.toLowerCase();

      // Calculate similarity scores
      const fullNameScore = stringSimilarity.compareTwoStrings(
        fullName,
        accountName
      );
      const firstNameScore = stringSimilarity.compareTwoStrings(
        member.first_name.toLowerCase(),
        accountName
      );
      const lastNameScore = stringSimilarity.compareTwoStrings(
        member.last_name.toLowerCase(),
        accountName
      );

      // Use the best score
      const score = Math.max(fullNameScore, firstNameScore, lastNameScore);

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = {
          memberId: member.id,
          memberName: `${member.first_name} ${member.last_name}`,
          confidence: score,
        };
      }
    }

    return bestMatch;
  }

  // Clean up old uploaded files (for shared hosting)
  async cleanupOldFiles() {
    try {
      const uploadDir = path.join(__dirname, "../uploads/bank-statements");
      if (!fs.existsSync(uploadDir)) return;

      const files = fs.readdirSync(uploadDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      console.error("File cleanup error:", error);
    }
  }
}

module.exports = new BankStatementController();
