import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Dialog from "../components/Dialog";
import { motion } from "framer-motion";

function SettingsPage() {
  const { user } = useAuth();
  const memberId = user?.id; // Assuming user.id is the member ID for default context
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [settings, setSettings] = useState({
    allow_savings_with_loan: false,
    savings_with_loan_amount: 0,
  });
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [loading, setLoading] = useState(false);

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMember?.id) {
      fetchMemberSettings(selectedMember.id);
    }
  }, [selectedMember]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/members/list", { headers: authHeader });
      console.log("Members Response:", response.data);
      setMembers(response.data.data || []);
      // If user is a member, preselect their ID
      if (memberId) {
        const userMember = response.data.data.find((m) => m.id === memberId);
        if (userMember) setSelectedMember(userMember);
      }
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load members.",
        type: "error",
      });
      console.error("Fetch Members Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberSettings = async (memberId) => {
    try {
      const response = await api.get(`/members/${memberId}/settings`, {
        headers: authHeader,
      });
      setSettings(
        response.data.data
          ? {
              allow_savings_with_loan:
                response.data.data.allow_savings_with_loan,
              savings_with_loan_amount:
                response.data.data.savings_with_loan_amount,
            }
          : {
              allow_savings_with_loan: false,
              savings_with_loan_amount: 0,
            }
      );
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load settings.",
        type: "error",
      });
      console.error("Fetch Settings Error:", err);
    }
  };

  const handleSearchTermChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(!!e.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setShowDropdown(false);
    setSelectedMember(null);
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setSearchTerm(
      `${member.member_id} - ${member.first_name} ${member.last_name}`
    );
    setShowDropdown(false);
  };

  const handleToggle = (e) => {
    const { name, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: checked,
      ...(name === "allow_savings_with_loan" && !checked
        ? { savings_with_loan_amount: 0 }
        : {}),
    }));
    setError("");
  };

  const handleAmountChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    if (value < 0) setError("Amount must be positive.");
    else if (value > 10000)
      setError("Amount exceeds contribution limit (max 10,000 NGN).");
    else setError("");
    setSettings((prev) => ({ ...prev, savings_with_loan_amount: value }));
  };

  const handleSave = async () => {
    if (!selectedMember) {
      setError("Please select a member.");
      return;
    }
    if (
      settings.allow_savings_with_loan &&
      !settings.savings_with_loan_amount
    ) {
      setError("Please enter a savings amount.");
      return;
    }
    try {
      setLoading(true);
      await api.put(`/members/${selectedMember.id}/settings`, settings, {
        headers: authHeader,
      });
      setDialog({
        message: "Settings updated successfully!",
        type: "success",
      });
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to save settings.",
        type: "error",
      });
      console.error("Save Settings Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setDialog(null);
  };

  const filteredMembers = members.filter((member) =>
    `${member.member_id} - ${member.first_name} ${member.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Member Settings
        </motion.h1>

        {dialog && (
          <Dialog
            message={dialog.message}
            type={dialog.type}
            onClose={closeDialog}
          />
        )}

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <svg
              className="animate-spin h-8 w-8 text-indigo-600"
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
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-xl shadow-md p-5"
          >
            <div className="space-y-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Member
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    placeholder="Search by member ID or name..."
                    aria-label="Search member"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label="Clear member search"
                    >
                      <svg
                        className="h-4 w-4"
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
                  )}
                </div>
                {showDropdown && filteredMembers.length > 0 && (
                  <ul className="absolute z-10 w-full max-w-[90vw] sm:max-w-[calc(50%-1rem)] bg-white border border-gray-200 rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto">
                    {filteredMembers.map((member) => (
                      <li
                        key={member.id}
                        onClick={() => handleMemberSelect(member)}
                        className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer transition-colors"
                      >
                        {member.member_id} - {member.first_name}{" "}
                        {member.last_name}
                      </li>
                    ))}
                  </ul>
                )}
                {searchTerm && filteredMembers.length === 0 && showDropdown && (
                  <p className="mt-1 text-xs text-gray-500">
                    No members found.
                  </p>
                )}
              </div>

              {selectedMember && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Settings for {selectedMember.first_name}{" "}
                    {selectedMember.last_name} (ID: {selectedMember.member_id})
                  </h2>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="allow_savings_with_loan"
                      checked={settings.allow_savings_with_loan}
                      onChange={handleToggle}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Allow Savings with Loan
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={settings.savings_with_loan_amount}
                      onChange={handleAmountChange}
                      disabled={!settings.allow_savings_with_loan}
                      placeholder="Enter amount (NGN)"
                      className="mt-1 block w-full sm:w-1/3 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 disabled:bg-gray-100"
                    />
                    <span className="text-sm text-gray-500">NGN</span>
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex justify-end gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.history.back()}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm min-w-[100px]"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 text-sm min-w-[100px] flex items-center justify-center"
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
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
