import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Dialog from "../components/Dialog";
import { motion } from "framer-motion";

const BankStatementProcessing = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  // State management
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [extractedTransactions, setExtractedTransactions] = useState([]);
  const [processingStep, setProcessingStep] = useState("upload"); // upload, extract, review, process
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const response = await api.get("/periods/list", { headers: authHeader });
      const openPeriods = response.data.data.filter(p => p.status === "open");
      setPeriods(openPeriods);
      if (openPeriods.length > 0) {
        setSelectedPeriod(openPeriods[0].id);
      }
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load periods.",
        type: "error",
      });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = async (files) => {
    if (!selectedPeriod) {
      setDialog({
        message: "Please select a period first.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await api.post("/bank-statements/upload", formData, {
        headers: {
          ...authHeader,
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadedFiles(response.data.data);
      setProcessingStep("extract");
      setDialog({
        message: "Files uploaded successfully!",
        type: "success",
      });
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to upload files.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtractData = async () => {
    if (uploadedFiles.length === 0) {
      setDialog({
        message: "No files to extract data from.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        "/bank-statements/extract",
        {
          bankStatementIds: uploadedFiles.map(f => f.id),
        },
        { headers: authHeader }
      );

      setDialog({
        message: "Data extraction completed!",
        type: "success",
      });

      // Move to name matching
      await handleMatchNames();
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to extract data.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMatchNames = async () => {
    setLoading(true);
    try {
      const response = await api.post(
        "/bank-statements/match-names",
        { confidenceThreshold: 0.7 },
        { headers: authHeader }
      );

      // Fetch extracted transactions for review
      await fetchExtractedTransactions();
      setProcessingStep("review");
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to match names.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExtractedTransactions = async () => {
    try {
      const response = await api.get("/bank-statements/transactions", {
        headers: authHeader,
      });
      setExtractedTransactions(response.data.data);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  const handleProcessTransactions = async () => {
    if (!selectedPeriod) {
      setDialog({
        message: "Please select a period.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        "/bank-statements/process",
        {
          periodId: selectedPeriod,
          bankStatementIds: uploadedFiles.map(f => f.id),
        },
        { headers: authHeader }
      );

      const result = response.data.data;
      setDialog({
        message: `Processing completed! ${result.processedCount} transactions processed, ${result.unmatchedCount} unmatched.`,
        type: "success",
      });

      setProcessingStep("complete");
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to process transactions.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportUnmatched = async () => {
    try {
      const response = await api.get("/bank-statements/unmatched", {
        headers: authHeader,
      });

      const unmatchedData = response.data.data;
      
      // Create CSV content
      const csvContent = [
        "Account Holder Name,Transaction Date,Amount,Transaction Type,Description,Account Number",
        ...unmatchedData.map(t => 
          `"${t.account_holder_name || ''}","${t.transaction_date || ''}","${t.amount || ''}","${t.transaction_type || ''}","${t.description || ''}","${t.account_number || ''}"`
        )
      ].join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'unmatched_transactions.csv';
      a.click();
      window.URL.revokeObjectURL(url);

      setDialog({
        message: "Unmatched transactions exported successfully!",
        type: "success",
      });
    } catch (err) {
      setDialog({
        message: "Failed to export unmatched transactions.",
        type: "error",
      });
    }
  };

  const closeDialog = () => {
    setDialog(null);
  };

  const resetProcess = () => {
    setUploadedFiles([]);
    setExtractedTransactions([]);
    setProcessingStep("upload");
  };

  const getMatchedTransactions = () => {
    return extractedTransactions.filter(t => t.status === "matched");
  };

  const getUnmatchedTransactions = () => {
    return extractedTransactions.filter(t => t.status === "unmatched");
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-6xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Bank Statement Processing
        </motion.h1>

        {dialog && (
          <Dialog
            message={dialog.message}
            type={dialog.type}
            onClose={closeDialog}
          />
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {["upload", "extract", "review", "process"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    processingStep === step
                      ? "bg-indigo-600 text-white"
                      : index < ["upload", "extract", "review", "process"].indexOf(processingStep)
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 capitalize">
                  {step}
                </span>
                {index < 3 && (
                  <div className="ml-4 w-8 h-0.5 bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Period Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-5 mb-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Period *
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            disabled={processingStep !== "upload"}
          >
            <option value="">Select Period</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({period.status})
              </option>
            ))}
          </select>
        </motion.div>

        {/* File Upload Section */}
        {processingStep === "upload" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md p-8"
          >
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="mt-4">
                <p className="text-lg font-medium text-gray-900">
                  Upload Bank Statements
                </p>
                <p className="text-sm text-gray-500">
                  Drag and drop PDF, Excel, or image files here (max 5MB each, up to 5 files)
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? "Uploading..." : "Browse Files"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>
          </motion.div>
        )}

        {/* Extract Data Section */}
        {processingStep === "extract" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Extract Data from Uploaded Files
            </h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                {uploadedFiles.length} file(s) uploaded successfully. Click the button below to extract transaction data using AI.
              </p>
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center text-sm text-gray-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {file.filename} ({file.fileType})
                  </div>
                ))}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExtractData}
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 text-sm flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin h-4 w-4 mr-2 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Extracting Data...
                </span>
              ) : (
                "Extract Transaction Data"
              )}
            </motion.button>
          </motion.div>
        )}

        {/* Review Section */}
        {processingStep === "review" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="text-sm font-medium text-gray-500">Total Transactions</h3>
                <p className="text-2xl font-bold text-gray-900">{extractedTransactions.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="text-sm font-medium text-gray-500">Matched</h3>
                <p className="text-2xl font-bold text-green-600">{getMatchedTransactions().length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="text-sm font-medium text-gray-500">Unmatched</h3>
                <p className="text-2xl font-bold text-red-600">{getUnmatchedTransactions().length}</p>
              </div>
            </div>

            {/* Matched Transactions */}
            {getMatchedTransactions().length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Matched Transactions ({getMatchedTransactions().length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account Holder
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Matched Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Confidence
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getMatchedTransactions().map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.account_holder_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.first_name} {transaction.last_name} ({transaction.member_code})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₦{parseFloat(transaction.amount).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.transaction_type === "credit"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {transaction.transaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(transaction.confidence_score * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Unmatched Transactions */}
            {getUnmatchedTransactions().length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Unmatched Transactions ({getUnmatchedTransactions().length})
                  </h2>
                  <button
                    onClick={handleExportUnmatched}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account Holder
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getUnmatchedTransactions().map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.account_holder_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₦{parseFloat(transaction.amount).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.transaction_type === "credit"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {transaction.transaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {transaction.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={resetProcess}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Start Over
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleProcessTransactions}
                disabled={loading || getMatchedTransactions().length === 0}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin h-4 w-4 mr-2 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Process Matched Transactions"
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Complete Section */}
        {processingStep === "complete" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md p-8 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Complete!
            </h2>
            <p className="text-gray-600 mb-6">
              Bank statement processing has been completed successfully.
            </p>
            <button
              onClick={resetProcess}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Process Another Statement
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BankStatementProcessing; 