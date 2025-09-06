import { useState, useEffect } from "react";
import api from "../services/api";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog"; // Fixed case to match Dialog.tsx

const ProcessMonthlyTransaction = () => {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [contributionSum, setContributionSum] = useState(null);
  const [processingResults, setProcessingResults] = useState(null);
  const [membersWithStopInterest, setMembersWithStopInterest] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null); // Removed type annotation

  useEffect(() => {
    fetchPeriods();
    fetchMembersWithStopInterest();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchContributionSum();
    } else {
      setContributionSum(null);
    }
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    try {
      const response = await api.get("/periods/list", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setPeriods(response.data.data || []);
      const openPeriod = response.data.data.find((p) => p.status === "open");
      if (openPeriod) setSelectedPeriod(openPeriod.id);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load periods.",
        type: "error",
      });
      console.error(err);
    }
  };

  const fetchMembersWithStopInterest = async () => {
    try {
      const response = await api.get("/members/with-stop-interest", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setMembersWithStopInterest(response.data.data || []);
    } catch (err) {
      console.error("Failed to load members with stop interest:", err);
    }
  };

  const fetchContributionSum = async () => {
    try {
      const response = await api.get(
        `/periods/contribution-sum-from-contributions/${selectedPeriod}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setContributionSum(response.data.data || 0);
    } catch (err) {
      setDialog({
        message:
          err.response?.data?.message || "Failed to load contribution sum.",
        type: "error",
      });
      console.error(err);
      setContributionSum(0);
    }
  };

  const handleProcess = async () => {
    setLoading(true);
    setDialog(null); // Reset dialog
    setProcessingResults(null);
    try {
      if (!selectedPeriod) throw new Error("Please select a period.");
      const response = await api.post(
        "/periods/process",
        { periodId: selectedPeriod },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setProcessingResults(response.data.data);
      setDialog({
        message: "Monthly transactions processed successfully!",
        type: "success",
      });
      fetchPeriods();
    } catch (err) {
      setDialog({
        message:
          err.response?.data?.message || "Failed to process transactions.",
        type: "error",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    setDialog(null); // Close the dialog
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Process Monthly Transactions
        </motion.h1>

        {/* Dialog for feedback */}
        {dialog && (
          <Dialog
            message={dialog.message}
            type={dialog.type}
            onClose={handleDialogClose}
          />
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-5 mb-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Select Period
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="">Select Period</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({period.status})
              </option>
            ))}
          </select>

          {/* Display Contribution Sum */}
          {contributionSum !== null && (
            <div className="mt-4 text-sm text-gray-600">
              <label className="font-medium">
                Total Contribution for Selected Period:
              </label>
              <span className="ml-2">
                {parseFloat(contributionSum).toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}
              </span>
            </div>
          )}
        </motion.div>

        {/* Members with Stop Interest */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-5 mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {membersWithStopInterest.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No members currently have stop interest enabled.
              </p>
            </div>
          )}
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleProcess}
          disabled={loading || !selectedPeriod}
          className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg shadow-md hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 text-sm flex items-center justify-center"
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
            "Process Transactions"
          )}
        </motion.button>

        {processingResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 bg-white rounded-xl shadow-md p-5 overflow-x-auto"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              Processing Results
            </h2>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Member ID
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Remaining Contribution (₦)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(processingResults) &&
                  processingResults.map((result) => (
                    <tr key={result.memberId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {result.memberId}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {parseFloat(
                          result.remainingContribution
                        ).toLocaleString("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProcessMonthlyTransaction;
