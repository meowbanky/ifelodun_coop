import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../services/api";
import { Form, Row, Col } from "react-bootstrap";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog"; // Import the Dialog component

const PeriodCreation = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null); // Replace error and success with dialog state

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const response = await api.get("/periods/list", { headers: authHeader });
      setPeriods(response.data.data || []);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load periods.",
        type: "error",
      });
      console.error("Fetch period error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) {
      setDialog({
        message: "Please select a month and year.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setDialog(null);

    const periodName = selectedDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    }); // e.g., "January 2025"

    try {
      await api.post(
        "/periods/create",
        { name: periodName },
        { headers: authHeader }
      );
      setDialog({
        message: `Period "${periodName}" created successfully!`,
        type: "success",
      });
      setSelectedDate(null);
      await fetchPeriods();
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to create period.",
        type: "error",
      });
      console.error("Create period error:", err);
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
          Create Period
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
            Add New Period
          </h2>
          <Row className="g-3 mb-4">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Month and Year
                </Form.Label>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholderText="Click to select month and year"
                  required
                  wrapperClassName="w-full"
                  popperClassName="max-w-[90vw]"
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
                Creating...
              </span>
            ) : (
              "Create Period"
            )}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-5"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Existing Periods
          </h2>
          {periods.length === 0 ? (
            <p className="text-gray-500 text-sm">No periods created yet.</p>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {periods.map((period) => (
                <li
                  key={period.id}
                  className="p-2 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-700"
                >
                  {period.name} - {period.status} (Created:{" "}
                  {new Date(period.created_at).toLocaleDateString()})
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PeriodCreation;
