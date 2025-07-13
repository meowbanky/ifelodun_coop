const pool = require("../config/database");
const ResponseHandler = require("../utils/response");
const path = require("path");

class DocumentController {
  async listDocuments(req, res) {
    const connection = await pool.getConnection();
    try {
      const [documents] = await connection.execute(
        "SELECT id, document_type, document_number, issue_date, expiry_date, document_path, verification_status, is_primary FROM documents WHERE member_id = ?",
        [req.params.memberId]
      );
      console.log("Documents for member:", req.params.memberId, documents);
      ResponseHandler.success(res, documents);
    } catch (error) {
      console.error("List documents error:", error);
      ResponseHandler.error(res, "Failed to fetch documents");
    } finally {
      connection.release();
    }
  }

  async uploadDocument(req, res) {
    const connection = await pool.getConnection();
    try {
      const { documentType, documentNumber, issueDate, expiryDate, isPrimary } =
        req.body;
      const file = req.file;

      // Validate required fields
      if (!req.params.memberId) {
        return ResponseHandler.error(res, "Member ID is required", 400);
      }
      if (!documentType) {
        return ResponseHandler.error(res, "Document type is required", 400);
      }
      if (!file) {
        return ResponseHandler.error(res, "No file uploaded", 400);
      }

      const documentPath = `/uploads/${file.filename}`; // Relative path stored in DB

      // Prepare parameters, ensuring undefined values are replaced with null
      const params = [
        req.params.memberId,
        documentType,
        documentNumber || null,
        issueDate || null,
        expiryDate || null,
        documentPath,
        isPrimary === "true" ? 1 : 0, // Handle boolean conversion
      ];

      await connection.execute(
        `INSERT INTO documents (member_id, document_type, document_number, issue_date, expiry_date, document_path, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params
      );

      ResponseHandler.success(res, null, "Document uploaded successfully", 201);
    } catch (error) {
      console.error("Upload document error:", error);
      ResponseHandler.error(res, "Failed to upload document");
    } finally {
      connection.release();
    }
  }

  async verifyDocument(req, res) {
    const connection = await pool.getConnection();
    try {
      const { status, notes } = req.body;
      await connection.execute(
        "UPDATE documents SET verification_status = ? WHERE id = ?",
        [status, req.params.documentId]
      );
      ResponseHandler.success(res, null, "Verification updated successfully");
    } catch (error) {
      console.error("Verify document error:", error);
      ResponseHandler.error(res, "Failed to verify document");
    } finally {
      connection.release();
    }
  }

  async previewDocument(req, res) {
    const connection = await pool.getConnection();
    try {
      const [documents] = await connection.execute(
        "SELECT document_path FROM documents WHERE id = ?",
        [req.params.documentId]
      );
      if (documents.length === 0) {
        return res.status(404).send("Document not found");
      }

      const filePath = path.join(__dirname, "..", documents[0].document_path); // Adjust based on uploads directory
      console.log("Serving file from:", filePath);

      // Ensure the file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found on server");
      }

      // Set content type based on extension
      const ext = path.extname(filePath).toLowerCase();
      const contentType =
        ext === ".pdf" ? "application/pdf" : `image/${ext.slice(1)}`;
      res.setHeader("Content-Type", contentType);

      // Allow CORS for image/preview access
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");

      res.sendFile(filePath, (err) => {
        if (err) {
          console.error("File send error:", err);
          res.status(500).send("Failed to serve file");
        }
      });
    } catch (error) {
      console.error("Preview document error:", error);
      res.status(500).send("Failed to preview document");
    } finally {
      connection.release();
    }
  }
}

const fs = require("fs"); // Add fs module for file existence check
module.exports = new DocumentController();
