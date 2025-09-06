import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Dialog from "../components/Dialog";
import { motion } from "framer-motion";

function StopInterestSettings() {
  const { user } = useAuth();
  const memberId = user?.id;
  const [members, setMembers] = useState([]);
  const [membersWithStopInterest, setMembersWithStopInterest] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [settings, setSettings] = useState({ stop_loan_interest: false });
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [loading, setLoading] = useState(false);

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchMembers();
    fetchMembersWithStopInterest();
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
      setMembers(response.data.data || []);
      if (memberId) {
        const userMember = response.data.data.find((m) => m.id === memberId);
        if (userMember) setSelectedMember(userMember);
      }
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load members.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembersWithStopInterest = async () => {
    try {
      const response = await api.get("/members/with-stop-interest", {
        headers: authHeader,
      });
      setMembersWithStopInterest(response.data.data || []);
    } catch (err) {
      console.error("Failed to load members with stop interest:", err);
    }
  };

  const fetchMemberSettings = async (memberId) => {
    try {
      const response = await api.get(`/members/${memberId}/settings`, {
        headers: authHeader,
      });
      setSettings({
        stop_loan_interest: response.data.data?.stop_loan_interest || false,
      });
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load settings.",
        type: "error",
      });
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
    // Don't reset settings here - let the useEffect handle fetching the actual settings

    // Scroll to the settings section
    setTimeout(() => {
      const settingsSection = document.querySelector("[data-settings-section]");
      if (settingsSection) {
        settingsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleToggle = (e) => {
    setSettings({ stop_loan_interest: e.target.checked });
    setError("");
  };

  const handleSave = async () => {
    if (!selectedMember) {
      setError("Please select a member.");
      return;
    }
    try {
      setLoading(true);
      await api.put(`/members/${selectedMember.id}/settings`, settings, {
        headers: authHeader,
      });
      setDialog({
        message: "Stop Interest setting updated successfully!",
        type: "success",
      });
      // Refresh the list after saving
      fetchMembersWithStopInterest();
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to save settings.",
        type: "error",
      });
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
          Stop Interest Settings
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
          <>
            {/* Members with Stop Interest List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md p-5 mb-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Members with Stop Interest Enabled
              </h2>
              {membersWithStopInterest.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Savings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loan Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {membersWithStopInterest.map((member) => (
                        <tr
                          key={member.id}
                          className={`hover:bg-gray-50 ${
                            selectedMember?.id === member.id
                              ? "bg-indigo-50 border-l-4 border-indigo-500"
                              : ""
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.member_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.first_name} {member.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {member.phone_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₦{member.total_savings?.toLocaleString() || "0.00"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₦{member.loan_balance?.toLocaleString() || "0.00"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleMemberSelect(member)}
                              className="text-indigo-600 hover:text-indigo-900 font-medium"
                            >
                              View Settings
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No members found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No members currently have stop interest enabled.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Member Search and Settings */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl shadow-md p-5"
              data-settings-section
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
                  {searchTerm &&
                    filteredMembers.length === 0 &&
                    showDropdown && (
                      <p className="mt-1 text-xs text-gray-500">
                        No members found.
                      </p>
                    )}
                </div>

                {selectedMember && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Stop Interest for {selectedMember.first_name}{" "}
                      {selectedMember.last_name} (ID: {selectedMember.member_id}
                      )
                    </h2>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="stop_loan_interest"
                        checked={settings.stop_loan_interest}
                        onChange={handleToggle}
                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Stop Loan Interest (Disable interest calculation for
                        this member)
                      </label>
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
          </>
        )}
      </div>
    </div>
  );
}

export default StopInterestSettings;
