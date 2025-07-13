import { useState, useEffect } from "react";
import api from "../services/api";
import { Form, Row, Col, Table } from "react-bootstrap";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog";

const LoanActivationThreshold = () => {
  const [threshold, setThreshold] = useState(null);
  const [formData, setFormData] = useState({ threshold: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchThreshold();
  }, []);

  const fetchThreshold = async () => {
    try {
      const response = await api.get("/periods/threshold", {
        headers: authHeader,
      });
      setThreshold(response.data.threshold || 5); // Default to 5 if not found
      setFormData({ threshold: response.data.threshold || "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load threshold.");
      setDialog({
        message: err.response?.data?.message || "Failed to load threshold.",
        type: "error",
      });
      console.error("Fetch threshold error:", err);
    }
  };

  const handleChange = (e) => {
    const { value } = e.target;
    if (
      value === "" ||
      (!isNaN(value) && parseInt(value) >= 1 && parseInt(value) <= 31)
    ) {
      setFormData((prev) => ({ ...prev, threshold: value }));
      setError("");
    } else {
      setError("Please enter a valid day (1-31).");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.threshold) {
      setError("Threshold is required.");
      return;
    }

    const thresholdValue = parseInt(formData.threshold);
    if (isNaN(thresholdValue) || thresholdValue < 1 || thresholdValue > 31) {
      setError("Please enter a valid day (1-31).");
      return;
    }

    setLoading(true);
    setError("");
    setDialog(null);

    try {
      const payload = { threshold: thresholdValue };
      await api.post("/periods/update-threshold", payload, {
        headers: authHeader,
      });
      setThreshold(thresholdValue);
      setDialog({
        message: "Threshold updated successfully!",
        type: "success",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update threshold.");
      setDialog({
        message: err.response?.data?.message || "Failed to update threshold.",
        type: "error",
      });
      console.error("Update threshold error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Loan Activation Threshold Configuration
        </motion.h1>

        {dialog && (
          <Dialog
            message={dialog.message}
            type={dialog.type}
            onClose={() => setDialog(null)}
          />
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-lg mb-6 shadow-sm bg-red-50 text-red-700"
          >
            {error}
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-md p-5 mb-6"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Set Loan Activation Day Threshold
          </h2>
          <Row className="g-3 mb-4">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                  Day Threshold (1-31)
                </Form.Label>
                <Form.Control
                  type="number"
                  name="threshold"
                  value={formData.threshold}
                  onChange={handleChange}
                  required
                  min="1"
                  max="31"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </Form.Group>
            </Col>
          </Row>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto py-2 px-4 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg shadow-sm hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 text-sm flex items-center justify-center"
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
                Saving...
              </span>
            ) : (
              "Update Threshold"
            )}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-5"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Current Threshold
          </h2>
          {threshold !== null ? (
            <Table striped hover className="text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-3 text-left">Day Threshold</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="py-2 px-3">{threshold}</td>
                </tr>
              </tbody>
            </Table>
          ) : (
            <p className="text-gray-500 text-sm">Loading threshold...</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LoanActivationThreshold;
