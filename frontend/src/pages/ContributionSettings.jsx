import { useState, useEffect } from "react";
import api from "../services/api";
import { Form, Row, Col } from "react-bootstrap";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog"; // Import the Dialog component

const ContributionSettings = () => {
  const [settings, setSettings] = useState({
    sharesRatio: "",
    savingsRatio: "",
    minimumMonthlyContribution: "",
  });
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null); // Replace error and success with dialog state

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get("/contributions/settings", {
        headers: authHeader,
      });
      const data = response.data.data || {};
      setSettings({
        sharesRatio: data.shares_ratio?.toString() || "",
        savingsRatio: data.savings_ratio?.toString() || "",
        minimumMonthlyContribution:
          data.minimum_monthly_contribution?.toString() || "",
      });
    } catch (err) {
      setDialog({
        message:
          err.response?.data?.message ||
          "Failed to load contribution settings.",
        type: "error",
      });
      console.error("Fetch settings error:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Allow empty input or valid numbers
    if (value !== "" && (isNaN(value) || parseFloat(value) < 0)) return;

    setSettings((prev) => {
      const newSettings = { ...prev, [name]: value };
      const parsedValue = parseFloat(value) || 0;

      if (name === "sharesRatio" && value !== "") {
        newSettings.savingsRatio = (100 - parsedValue).toFixed(2);
      } else if (name === "savingsRatio" && value !== "") {
        newSettings.sharesRatio = (100 - parsedValue).toFixed(2);
      }

      return newSettings;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !settings.sharesRatio ||
      !settings.savingsRatio ||
      !settings.minimumMonthlyContribution
    ) {
      setDialog({
        message: "All fields are required.",
        type: "error",
      });
      return;
    }

    const sharesRatio = parseFloat(settings.sharesRatio);
    const savingsRatio = parseFloat(settings.savingsRatio);
    const minimumMonthlyContribution = parseFloat(
      settings.minimumMonthlyContribution
    );

    if (
      isNaN(sharesRatio) ||
      isNaN(savingsRatio) ||
      isNaN(minimumMonthlyContribution)
    ) {
      setDialog({
        message: "Please enter valid numbers.",
        type: "error",
      });
      return;
    }

    if (sharesRatio + savingsRatio !== 100) {
      setDialog({
        message: "Shares and savings ratios must sum to 100%.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setDialog(null);

    try {
      const payload = {
        sharesRatio,
        savingsRatio,
        minimumMonthlyContribution,
      };

      await api.put("/contributions/settings", payload, {
        headers: authHeader,
      });
      setDialog({
        message: "Settings updated successfully!",
        type: "success",
      });
      await fetchSettings();
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to update settings.",
        type: "error",
      });
      console.error("Update settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatNGN = (value) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-2xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Contribution Settings
        </motion.h1>

        {dialog && (
          <Dialog
            message={dialog.message}
            type={dialog.type}
            onClose={() => setDialog(null)} // Allow closing the dialog
          />
        )}

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-md p-5 mb-6"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Configure Contribution Ratios
          </h2>
          <Row className="g-3 mb-4">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                  Shares Ratio (%)
                </Form.Label>
                <Form.Control
                  type="number"
                  name="sharesRatio"
                  value={settings.sharesRatio}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <Form.Text className="text-sm text-gray-500">
                  Percentage allocated to shares
                </Form.Text>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                  Savings Ratio (%)
                </Form.Label>
                <Form.Control
                  type="number"
                  name="savingsRatio"
                  value={settings.savingsRatio}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed text-sm"
                />
                <Form.Text className="text-sm text-gray-500">
                  Auto-calculated (100 - Shares Ratio)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Monthly Contribution (₦)
                </Form.Label>
                <Form.Control
                  type="number"
                  name="minimumMonthlyContribution"
                  value={settings.minimumMonthlyContribution}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <Form.Text className="text-sm text-gray-500">
                  Minimum monthly contribution (in Naira)
                </Form.Text>
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
              "Save Settings"
            )}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-5"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Contribution Breakdown Preview
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              For a monthly contribution of{" "}
              {formatNGN(settings.minimumMonthlyContribution)}:
            </p>
            <Row className="g-4">
              <Col xs={12} sm={6}>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-700 text-sm">
                    Shares Portion
                  </p>
                  <p className="text-xl font-bold text-indigo-600">
                    {formatNGN(
                      (settings.minimumMonthlyContribution *
                        parseFloat(settings.sharesRatio)) /
                        100
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {settings.sharesRatio}% of total
                  </p>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-700 text-sm">
                    Savings Portion
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {formatNGN(
                      (settings.minimumMonthlyContribution *
                        parseFloat(settings.savingsRatio)) /
                        100
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {settings.savingsRatio}% of total
                  </p>
                </div>
              </Col>
            </Row>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContributionSettings;
