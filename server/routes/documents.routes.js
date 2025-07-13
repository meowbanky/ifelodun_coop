// routes/documents.routes.js
const express = require("express");
const router = express.Router({ mergeParams: true }); // Merge params to access :memberId from parent
// const documentController = require("../controllers/document.controller");
const documentController = require("../controllers/document.controller");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.use(authMiddleware);

// List documents for a member
router.get("/", documentController.listDocuments);

// Upload a new document
router.post("/", upload.single("file"), documentController.uploadDocument);

// Verify a document (adjusted to include memberId context if needed)
router.put("/:documentId/verify", documentController.verifyDocument);

// Preview a document
router.get("/:documentId/preview", documentController.previewDocument);

module.exports = router;
