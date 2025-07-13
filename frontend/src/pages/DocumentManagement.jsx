import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import api from "../services/api";

const DocumentViewer = ({ document, memberId }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);

  useEffect(() => {
    if (!document || !document.id) return; // Guard against undefined document

    const fetchPreview = async () => {
      try {
        const response = await api.get(
          `/members/${memberId}/documents/${document.id}/preview`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            responseType: "blob",
          }
        );
        const url = URL.createObjectURL(response.data);
        setPreviewSrc(url);
      } catch (err) {
        console.error("Failed to fetch preview:", err);
      }
    };
    fetchPreview();
  }, [document?.id, memberId]);

  const renderPreview = () => {
    if (!previewSrc) return <p>Loading preview...</p>;

    const fileExtension = document.document_path.split(".").pop().toLowerCase();
    return fileExtension === "pdf" ? (
      <iframe
        src={previewSrc}
        className="w-full h-96 rounded-lg border border-gray-200"
        title="Document Preview"
      />
    ) : (
      <img
        src={previewSrc}
        alt="Document Preview"
        className="max-w-full h-auto rounded-lg border border-gray-200"
      />
    );
  };

  if (!document) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="p-2 text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </button>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Document Preview
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {renderPreview()}
          </div>
        </div>
      )}
    </div>
  );
};

DocumentViewer.propTypes = {
  document: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    document_path: PropTypes.string.isRequired,
  }),
  memberId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
};

const DocumentManagement = ({ memberId, onUpload }) => {
  const [documents, setDocuments] = useState([]);
  const [newDocument, setNewDocument] = useState({
    documentType: "",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    file: null,
    isPrimary: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [memberId]);

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/members/${memberId}/documents`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("Documents fetched:", response.data.data); // Debug
      setDocuments(response.data.data || []);
    } catch (err) {
      setError("Failed to load documents.");
      console.error("Fetch documents error:", err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    Object.entries(newDocument).forEach(([key, value]) => {
      if (key === "file" && value) {
        formData.append(key, value);
      } else if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    try {
      await api.post(`/members/${memberId}/documents`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setSuccess("Document uploaded successfully.");
      setNewDocument({
        documentType: "",
        documentNumber: "",
        issueDate: "",
        expiryDate: "",
        file: null,
        isPrimary: false,
      });
      fetchDocuments();
      if (onUpload) onUpload(); // Notify parent (Members.jsx)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload document.");
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (documentId, status, notes = "") => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.put(
        `/members/documents/${documentId}/verify`,
        { status, notes },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setSuccess("Verification status updated.");
      fetchDocuments();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update verification status."
      );
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "verified":
        return (
          <svg
            className="w-5 h-5 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "rejected":
        return (
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const isExpiringSoon = (expiryDate) =>
    expiryDate &&
    (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24) <= 30 &&
    new Date(expiryDate) > new Date();
  const isExpired = (expiryDate) =>
    expiryDate && new Date(expiryDate) < new Date();

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setNewDocument((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : type === "file" ? files[0] : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Upload Document
        </h4>
        {(error || success) && (
          <div
            className={`p-4 rounded-lg mb-4 ${
              error ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {error || success}
          </div>
        )}
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Document Type
              </label>
              <select
                name="documentType"
                value={newDocument.documentType}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select Type</option>
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver&apos;s License</option>
                <option value="voters_card">Voter&apos;s Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Document Number
              </label>
              <input
                type="text"
                name="documentNumber"
                value={newDocument.documentNumber}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Issue Date
              </label>
              <input
                type="date"
                name="issueDate"
                value={newDocument.issueDate}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={newDocument.expiryDate}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Document File
              </label>
              <input
                type="file"
                name="file"
                onChange={handleInputChange}
                accept=".pdf,.jpg,.jpeg,.png"
                required
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-600 file:text-white file:hover:bg-indigo-700"
              />
            </div>
            <div className="md:col-span-2 flex items-center">
              <input
                type="checkbox"
                name="isPrimary"
                checked={newDocument.isPrimary}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                Set as Primary ID
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </div>

      {/* Document List */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Uploaded Documents
        </h4>
        {documents.length === 0 ? (
          <p className="text-gray-500">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-4">
            {documents
              .filter((doc) => doc)
              .map((doc, index) => (
                <div
                  key={doc.id}
                  className="p-4 bg-gray-50 rounded-md border border-gray-200 flex justify-between items-center"
                >
                  <div>
                    <p>
                      <strong>Type:</strong>{" "}
                      {doc.document_type
                        .replace("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    <p>
                      <strong>Number:</strong> {doc.document_number}
                    </p>
                    <p>
                      <strong>Issue Date:</strong>{" "}
                      {new Date(doc.issue_date).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Expiry Date:</strong>{" "}
                      {new Date(doc.expiry_date).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {doc.verification_status || "Pending"}
                    </p>
                    {doc.is_primary && (
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <DocumentViewer document={doc} memberId={memberId} />
                    {doc.verification_status === "pending" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleVerification(doc.id, "verified")}
                          className="p-2 text-green-600 hover:text-green-800 transition-colors"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleVerification(doc.id, "rejected")}
                          className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

DocumentManagement.propTypes = {
  memberId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  onUpload: PropTypes.func,
};

export default DocumentManagement;
