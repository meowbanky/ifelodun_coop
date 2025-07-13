import { useState, useEffect } from "react";
import api from "../services/api";
import { Form, Row, Col, Table } from "react-bootstrap";
import Select from "react-select";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog";

const FeeConfiguration = () => {
  const [fees, setFees] = useState([]);
  const [formData, setFormData] = useState({
    fee_type: "",
    amount: "",
    description: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // const [success, setSuccess] = useState("");
  const [dialog, setDialog] = useState(null);

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  const feeTypeOptions = [
    { value: "entry", label: "Entry Fee" },
    { value: "stationery", label: "Stationery Fee" },
    { value: "development_levy", label: "Development Levy Fee" },
  ];

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      const response = await api.get("/fees/config", { headers: authHeader });
      setFees(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load fees.");
      setDialog({
        message: err.response?.data?.message || "Failed to load fees.",
        type: "error",
      });
      console.error("Fetch fees error:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (
      name === "amount" &&
      value !== "" &&
      (isNaN(value) || parseFloat(value) < 0)
    )
      return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeeTypeChange = (option) => {
    setFormData((prev) => ({ ...prev, fee_type: option?.value || "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fee_type || !formData.amount) {
      setError("Fee type and amount are required.");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    setError("");
    setDialog(null);

    try {
      const payload = { ...formData, amount };
      if (editingId) {
        await api.put(`/fees/config/${editingId}`, payload, {
          headers: authHeader,
        });
        // setSuccess("Fee updated successfully!");
        setDialog({
          message: "Fee updated successfully!",
          type: "success",
        });
      } else {
        await api.post("/fees/config", payload, { headers: authHeader });
        // setSuccess("Fee added successfully!");
        setDialog({
          message: "Fee added successfully!",
          type: "success",
        });
      }
      setFormData({ fee_type: "", amount: "", description: "" });
      setEditingId(null);
      await fetchFees();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save fee.");
      setDialog({
        message: err.response?.data?.message || "Failed to save fee.",
        type: "error",
      });
      console.error("Save fee error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fee) => {
    setFormData({
      fee_type: fee.fee_type,
      amount: fee.amount.toString(),
      description: fee.description || "",
    });
    setEditingId(fee.id);
  };

  const selectStyles = {
    control: (base) => ({
      ...base,
      borderColor: "#d1d5db",
      borderRadius: "0.5rem",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      backgroundColor: "rgba(255,255,255,0.05)",
      "&:hover": { borderColor: "#4f46e5" },
      "&:focus": {
        borderColor: "#4f46e5",
        boxShadow: "0 0 0 2px rgba(79,70,229,0.5)",
      },
    }),
    menu: (base) => ({
      ...base,
      maxWidth: "90vw",
      width: "100%",
      zIndex: 1000,
      backgroundColor: "#fff",
    }),
    option: (base, { isFocused }) => ({
      ...base,
      backgroundColor: isFocused ? "#e0e7ff" : "#fff",
      color: "#1f2937",
      "&:hover": { backgroundColor: "#e0e7ff" },
    }),
    singleValue: (base) => ({
      ...base,
      color: "#1f2937",
    }),
  };

  const formatNGN = (value) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Fee Configuration
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
            {editingId ? "Edit Fee" : "Add New Fee"}
          </h2>
          <Row className="g-3 mb-4">
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                  Fee Type
                </Form.Label>
                <Select
                  options={feeTypeOptions}
                  value={
                    feeTypeOptions.find(
                      (opt) => opt.value === formData.fee_type
                    ) || null
                  }
                  onChange={handleFeeTypeChange}
                  placeholder="Select Fee Type"
                  isSearchable={false}
                  isDisabled={editingId}
                  className="text-sm"
                  styles={selectStyles}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₦)
                </Form.Label>
                <Form.Control
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </Form.Label>
                <Form.Control
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
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
            ) : editingId ? (
              "Update Fee"
            ) : (
              "Add Fee"
            )}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-5"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Current Fees
          </h2>
          {fees.length === 0 ? (
            <p className="text-gray-500 text-sm">No fees configured yet.</p>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-3 text-left">Fee Type</th>
                    <th className="py-2 px-3 text-left">Amount</th>
                    <th className="py-2 px-3 text-left">Description</th>
                    <th className="py-2 px-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee) => (
                    <tr key={fee.id} className="border-t">
                      <td className="py-2 px-3">
                        {feeTypeOptions.find(
                          (opt) => opt.value === fee.fee_type
                        )?.label || fee.fee_type}
                      </td>
                      <td className="py-2 px-3">{formatNGN(fee.amount)}</td>
                      <td className="py-2 px-3">{fee.description || "N/A"}</td>
                      <td className="py-2 px-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(fee)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm"
                        >
                          Edit
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FeeConfiguration;
