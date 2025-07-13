import { useState, useEffect } from "react";
import api from "../services/api";
import { Form, Row, Col } from "react-bootstrap";
import Select from "react-select";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog";

const MemberBankDetails = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [banks, setBanks] = useState([]);
  const [formData, setFormData] = useState({
    bankSortcode: "",
    accountNumber: "",
    accountName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // const [success, setSuccess] = useState("");
  const [dialog, setDialog] = useState(null); // For dialog messages

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [membersResponse, banksResponse] = await Promise.all([
        api.get("/members/list", { headers: authHeader }),
        api.get("/members/bank-sortcodes", { headers: authHeader }),
      ]);

      const membersData = membersResponse.data.data || [];
      const banksData = banksResponse.data.data || [];

      setMembers(
        membersData.map((m) => ({
          value: m.id,
          label: `${m.member_id} - ${m.first_name} ${m.last_name}`,
        }))
      );

      setBanks(
        banksData.map((b) => ({
          value: b.sortcode,
          label: `${b.bank_name} (${b.sortcode})`,
        }))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load initial data.");
      setDialog({
        message: err.response?.data?.message || "Failed to load initial data.",
        type: "error",
      });
      console.error("Fetch initial data error:", err);
    }
  };

  const fetchBankDetails = async (memberId) => {
    try {
      const response = await api.get(`/members/${memberId}/bank-details`, {
        headers: authHeader,
      });
      const details = response.data.data[0] || null;
      setBankDetails(details);
      setFormData({
        bankSortcode: details?.sortcode || "",
        accountNumber: details?.account_number || "",
        accountName: details?.account_name || "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load bank details.");
      setDialog({
        message: err.response?.data?.message || "Failed to load bank details.",
        type: "error",
      });
      console.error("Fetch bank details error:", err);
    }
  };

  const handleMemberSelect = (option) => {
    setSelectedMember(option);
    setBankDetails(null);
    setFormData({ bankSortcode: "", accountNumber: "", accountName: "" });
    if (option) {
      fetchBankDetails(option.value);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBankSelect = (option) => {
    setFormData((prev) => ({ ...prev, bankSortcode: option?.value || "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      setError("Please select a member.");
      return;
    }
    if (!formData.bankSortcode || !formData.accountNumber) {
      setError("Bank sort code and account number are required.");
      return;
    }

    setLoading(true);
    setError("");
    // setSuccess("");
    setDialog(null);

    try {
      const selectedBank = banks.find(
        (bank) => bank.value === formData.bankSortcode
      );
      if (!selectedBank) throw new Error("Invalid bank sort code selected.");

      const payload = {
        memberId: selectedMember.value,
        bankName: selectedBank.label.split(" (")[0],
        sortcode: selectedBank.value,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName || "",
      };

      await api.post(`/members/${selectedMember.value}/bank-details`, payload, {
        headers: authHeader,
      });
      // setSuccess("Bank details saved successfully!");
      setDialog({
        message: "Bank details saved successfully!",
        type: "success",
      });
      await fetchBankDetails(selectedMember.value);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save bank details.");
      setDialog({
        message: err.response?.data?.message || "Failed to save bank details.",
        type: "error",
      });
      console.error("Submit error:", err);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Manage Member Bank Details
        </motion.h1>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-lg mb-6 shadow-sm bg-red-50 text-red-700"
          >
            {error}
          </motion.div>
        )}

        {dialog && (
          <Dialog
            message={dialog.message}
            type={dialog.type}
            onClose={() => setDialog(null)}
          />
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-5 mb-6"
        >
          <Form.Group className="mb-4">
            <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
              Select Member
            </Form.Label>
            <Select
              options={members}
              value={selectedMember}
              onChange={handleMemberSelect}
              placeholder="Search by member ID or name..."
              isSearchable
              isClearable
              className="text-sm"
              styles={selectStyles}
            />
          </Form.Group>
        </motion.div>

        {selectedMember && bankDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-md p-5 mb-6"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              Current Bank Details
            </h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <strong>Bank Name:</strong> {bankDetails.bank_name || "N/A"}
              </p>
              <p>
                <strong>Sort Code:</strong> {bankDetails.sortcode || "N/A"}
              </p>
              <p>
                <strong>Account Number:</strong>{" "}
                {bankDetails.account_number || "N/A"}
              </p>
              <p>
                <strong>Account Name:</strong>{" "}
                {bankDetails.account_name || "N/A"}
              </p>
            </div>
          </motion.div>
        )}

        {selectedMember && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-md p-5"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              Update Bank Details
            </h2>
            <Row className="g-3 mb-4">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank
                  </Form.Label>
                  <Select
                    options={banks}
                    value={
                      banks.find((b) => b.value === formData.bankSortcode) ||
                      null
                    }
                    onChange={handleBankSelect}
                    placeholder="Select Bank"
                    isSearchable
                    className="text-sm"
                    styles={selectStyles}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name (Optional)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </Form.Group>
              </Col>
            </Row>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading || !selectedMember}
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
                "Save Bank Details"
              )}
            </motion.button>
          </motion.form>
        )}
      </div>
    </div>
  );
};

export default MemberBankDetails;
