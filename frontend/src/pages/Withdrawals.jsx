import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Dialog from "../components/Dialog";
import { motion } from "framer-motion";

function Withdrawals() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [balances, setBalances] = useState({ shares: 0, savings: 0 });
  const [oldBalances, setOldBalances] = useState(null); // Store previous balances for display
  const [type, setType] = useState("savings");
  const [amount, setAmount] = useState("");
  const [dialog, setDialog] = useState(null);
  const [loading, setLoading] = useState(false);

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchMembers();
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedMember && selectedPeriod) {
      fetchBalances();
    }
    // eslint-disable-next-line
  }, [selectedMember, selectedPeriod]);

  const fetchMembers = async () => {
    try {
      const res = await api.get("/members/list", { headers: authHeader });
      setMembers(res.data.data || []);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load members.",
        type: "error",
      });
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await api.get("/periods/list", { headers: authHeader });
      setPeriods(res.data.data || []);
      if (res.data.data && res.data.data.length > 0) {
        setSelectedPeriod(res.data.data[0].id);
      }
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load periods.",
        type: "error",
      });
    }
  };

  const fetchBalances = async () => {
    try {
      const res = await api.get(
        `/members/${selectedMember.id}/cumulative-balances`,
        { headers: authHeader }
      );
      // Map backend keys to frontend keys
      const data = res.data.data || { total_shares: 0, total_savings: 0 };
      setBalances({ shares: data.total_shares, savings: data.total_savings });
      setOldBalances(null); // Reset old balances on member/period change
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load balances.",
        type: "error",
      });
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      setDialog({ message: "Please select a member.", type: "error" });
      return;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setDialog({ message: "Enter a valid amount.", type: "error" });
      return;
    }
    setLoading(true);
    setDialog(null);
    try {
      setOldBalances({ ...balances }); // Store old balances before withdrawal
      const res = await api.post(
        `/members/${selectedMember.id}/withdraw`,
        {
          period_id: selectedPeriod, // Keep for record keeping, but withdrawal is now cumulative
          type,
          amount: parseFloat(amount),
        },
        { headers: authHeader }
      );
      setDialog({ message: "Withdrawal successful!", type: "success" });
      setAmount("");
      // Update balances with new values from response if available
      if (res.data && res.data.data) {
        // Map backend keys to frontend keys after withdrawal
        const data = res.data.data;
        setBalances({ shares: data.total_shares, savings: data.total_savings });
      } else {
        fetchBalances();
      }
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Withdrawal failed.",
        type: "error",
      });
    } finally {
      setLoading(false);
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

  const filteredMembers = members.filter((member) =>
    `${member.member_id} - ${member.first_name} ${member.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-2xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Withdraw from Shares or Savings
        </motion.h1>
        {dialog && (
          <Dialog
            message={dialog.message}
            type={dialog.type}
            onClose={() => setDialog(null)}
          />
        )}
        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          <div className="mb-4">
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
                    {member.member_id} - {member.first_name} {member.last_name}
                  </li>
                ))}
              </ul>
            )}
            {searchTerm && filteredMembers.length === 0 && showDropdown && (
              <p className="mt-1 text-xs text-gray-500">No members found.</p>
            )}
          </div>
          {selectedMember && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Period (for record keeping)
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Withdrawals are processed from cumulative balances across all periods
                </p>
              </div>
              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Total Shares Balance</div>
                  <div className="text-lg font-bold text-indigo-700">
                    ₦{parseFloat(balances.shares || 0).toLocaleString()}
                  </div>
                  {oldBalances && (
                    <div className="text-xs text-gray-500">
                      Previous: ₦
                      {parseFloat(oldBalances.shares || 0).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Total Savings Balance</div>
                  <div className="text-lg font-bold text-green-700">
                    ₦{parseFloat(balances.savings || 0).toLocaleString()}
                  </div>
                  {oldBalances && (
                    <div className="text-xs text-gray-500">
                      Previous: ₦
                      {parseFloat(oldBalances.savings || 0).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <form onSubmit={handleWithdraw} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Withdrawal Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="savings">Savings</option>
                    <option value="shares">Shares</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Enter amount to withdraw"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg shadow-sm hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 text-sm flex items-center justify-center"
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
                    "Withdraw"
                  )}
                </motion.button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Withdrawals;
