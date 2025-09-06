import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Dialog from "../components/Dialog";

const MemberFinancialManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dialog, setDialog] = useState({ message: "", type: "", show: false });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [formData, setFormData] = useState({
    savings: 0,
    shares: 0,
    interestCharged: 0,
    interestPaid: 0,
    loans: [],
  });

  const { user } = useAuth();

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  // Add error boundary for the component
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-red-600 mb-4">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                There was an error loading the Member Financial Management page.
              </p>
              <button
                onClick={() => {
                  setHasError(false);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Clear any existing dialog on page load
    setDialog({ message: "", type: "", show: false });
  }, []);

  useEffect(() => {
    try {
      fetchPeriods();
    } catch (error) {
      console.error("Error in useEffect:", error);
      setHasError(true);
    }
  }, []);

  const fetchPeriods = async () => {
    try {
      console.log("Fetching periods...");
      const response = await api.get("/periods/list", { headers: authHeader });
      console.log("Periods response:", response.data);

      if (response.data && response.data.data) {
        setPeriods(response.data.data || []);
        console.log(
          "Periods loaded successfully:",
          response.data.data.length,
          "periods"
        );
      } else {
        console.error("Invalid periods response structure:", response.data);
        console.log("Setting error dialog for invalid response");
        setDialog({
          message: "Invalid response from server",
          type: "error",
          show: true,
        });
      }
    } catch (error) {
      console.error("Failed to fetch periods:", error);
      console.error("Periods error details:", error.response?.data);
      console.log("Setting error dialog for periods fetch error");
      setDialog({
        message: error.response?.data?.message || "Failed to load periods",
        type: "error",
        show: true,
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const searchMembers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      console.log("Searching for members with query:", query);
      const response = await api.get(
        `/members/search?query=${encodeURIComponent(query)}`,
        {
          headers: authHeader,
        }
      );
      console.log("Search response:", response.data);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error("Search failed:", error);
      console.error("Search error details:", error.response?.data);
      setDialog({
        message: error.response?.data?.message || "Search failed",
        type: "error",
        show: true,
      });
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(value.length >= 2);
    searchMembers(value);
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setSearchTerm(
      `${member.first_name} ${member.last_name} (${member.member_id})`
    );
    setShowDropdown(false);
    setFinancialData(null);
    setSelectedPeriod(null);
  };

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
    setShowPeriodDropdown(false);
    if (selectedMember) {
      fetchFinancialData(selectedMember.id, period.id);
    }
  };

  const fetchFinancialData = async (memberId, periodId) => {
    setLoading(true);
    try {
      console.log(
        "Fetching financial data for member:",
        memberId,
        "period:",
        periodId
      );
      const response = await api.get(
        `/members/${memberId}/financial-data/${periodId}`,
        {
          headers: authHeader,
        }
      );
      console.log("Financial data response:", response.data);

      if (response.data && response.data.data) {
        const data = response.data.data;
        setFinancialData(data);
        setFormData({
          savings: data.balances?.savings || 0,
          shares: data.balances?.shares || 0,
          interestCharged: data.interestCharged || 0,
          interestPaid: data.interestPaid || 0,
          loans: data.loans || [],
        });
      } else {
        console.error("Invalid response structure:", response.data);
        setDialog({
          message: "Invalid response from server",
          type: "error",
          show: true,
        });
      }
    } catch (error) {
      console.error("Failed to fetch financial data:", error);
      console.error("Error details:", error.response?.data);
      setDialog({
        message:
          error.response?.data?.message || "Failed to load financial data",
        type: "error",
        show: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLoanChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      loans: prev.loans.map((loan, i) =>
        i === index ? { ...loan, [field]: value } : loan
      ),
    }));
  };

  const addLoan = () => {
    setFormData((prev) => ({
      ...prev,
      loans: [
        ...prev.loans,
        {
          amount: 0,
          interest_rate: 0,
          status: "pending",
          grant_date: "",
          due_date: "",
        },
      ],
    }));
  };

  const removeLoan = (index) => {
    setFormData((prev) => ({
      ...prev,
      loans: prev.loans.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!selectedMember || !selectedPeriod) {
      setDialog({
        message: "Please select both member and period",
        type: "error",
        show: true,
      });
      return;
    }

    setSaving(true);
    try {
      await api.put(
        `/members/${selectedMember.id}/financial-data/${selectedPeriod.id}`,
        formData,
        { headers: authHeader }
      );

      setDialog({
        message: "Financial data updated successfully",
        type: "success",
        show: true,
      });

      // Refresh the data
      fetchFinancialData(selectedMember.id, selectedPeriod.id);
    } catch (error) {
      console.error("Failed to save financial data:", error);
      setDialog({
        message:
          error.response?.data?.message || "Failed to save financial data",
        type: "error",
        show: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedMember(null);
    setSelectedPeriod(null);
    setSearchTerm("");
    setFinancialData(null);
    setFormData({
      savings: 0,
      shares: 0,
      interestCharged: 0,
      interestPaid: 0,
      loans: [],
    });
    // Also clear any error dialogs
    setDialog({ message: "", type: "", show: false });
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">
                Loading Member Financial Management...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Member Financial Data Management
            </h1>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Reset
            </button>
          </div>

          {/* Member Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Member
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by name, member ID, or email..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => handleMemberSelect(member)}
                      className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {member.member_id} | {member.email}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Period Selection */}
          {selectedMember && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Period
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                  className="w-full p-3 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {selectedPeriod ? selectedPeriod.name : "Select a period..."}
                </button>
                {showPeriodDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {periods.map((period) => (
                      <div
                        key={period.id}
                        onClick={() => handlePeriodSelect(period)}
                        className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {period.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Status: {period.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial Data Form */}
          {selectedMember && selectedPeriod && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                  {/* Member and Period Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {selectedMember.first_name} {selectedMember.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Member ID: {selectedMember.member_id} | Period:{" "}
                      {selectedPeriod.name}
                    </p>
                  </div>

                  {/* Savings and Shares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Savings Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.savings}
                        onChange={(e) =>
                          handleInputChange(
                            "savings",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shares Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.shares}
                        onChange={(e) =>
                          handleInputChange(
                            "shares",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Interest */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interest Charged
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.interestCharged}
                        onChange={(e) =>
                          handleInputChange(
                            "interestCharged",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interest Paid
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.interestPaid}
                        onChange={(e) =>
                          handleInputChange(
                            "interestPaid",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Outstanding Interest Display */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800">
                      Outstanding Interest: ₦
                      {(
                        formData.interestCharged - formData.interestPaid
                      ).toFixed(2)}
                    </h4>
                  </div>

                  {/* Loans Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Loans
                      </h3>
                      <button
                        onClick={addLoan}
                        className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
                      >
                        Add Loan
                      </button>
                    </div>

                    <div className="space-y-4">
                      {formData.loans.map((loan, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium text-gray-900">
                              Loan #{index + 1}
                            </h4>
                            <button
                              onClick={() => removeLoan(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={loan.amount}
                                onChange={(e) =>
                                  handleLoanChange(
                                    index,
                                    "amount",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Interest Rate (%)
                              </label>
                              <input
                                type="number"
                                step="0.001"
                                value={loan.interest_rate}
                                onChange={(e) =>
                                  handleLoanChange(
                                    index,
                                    "interest_rate",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                value={loan.status}
                                onChange={(e) =>
                                  handleLoanChange(
                                    index,
                                    "status",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="defaulted">Defaulted</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Grant Date
                              </label>
                              <input
                                type="date"
                                value={loan.grant_date}
                                onChange={(e) =>
                                  handleLoanChange(
                                    index,
                                    "grant_date",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date
                              </label>
                              <input
                                type="date"
                                value={loan.due_date}
                                onChange={(e) =>
                                  handleLoanChange(
                                    index,
                                    "due_date",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      <Dialog
        message={dialog.message}
        type={dialog.type}
        show={dialog.show}
        onClose={() => setDialog({ message: "", type: "", show: false })}
      />
    </div>
  );
};

export default MemberFinancialManagement;
