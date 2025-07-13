import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import DeleteConfirmation from "../components/DeleteConfirmation";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const LoanProcessing = () => {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [members, setMembers] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetails, setMemberDetails] = useState(null);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [loanData, setLoanData] = useState({
    loanTypeId: "",
    amount: "",
    grantDate: null,
  });
  const [editLoan, setEditLoan] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    show: false,
    loanId: null,
  });
  const [totalLoansForMonth, setTotalLoansForMonth] = useState(0);
  const [totalLoansForPeriod, setTotalLoansForPeriod] = useState(0);

  const amountRef = useRef(null);
  const editAmountRef = useRef(null);
  const dateRef = useRef(null);
  const cursorPositions = useRef({ main: null, edit: null });

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      console.log("Selected Period in useEffect:", selectedPeriod);
      if (selectedPeriod) {
        await fetchPendingLoans(selectedPeriod);
        await fetchTotalLoansForMonth(selectedPeriod);
        const total = await fetchTotalLoansForPeriod(selectedPeriod);
        setTotalLoansForPeriod(total);
        console.log("State after useEffect - totalLoansForPeriod:", total);
      } else {
        setPendingLoans([]);
        setTotalLoansForMonth(0);
        setTotalLoansForPeriod(0);
        console.log("Reset totals because no period selected");
      }
    };
    fetchData();
  }, [selectedPeriod]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [periodsResponse, membersResponse, loanTypesResponse] =
        await Promise.all([
          api.get("/periods/list", { headers: authHeader }),
          api.get("/members/list", { headers: authHeader }),
          api.get("/loan-types/list", { headers: authHeader }),
        ]);
      console.log("Initial Data:", {
        periods: periodsResponse.data,
        members: membersResponse.data,
        loanTypes: loanTypesResponse.data,
      });
      setPeriods(periodsResponse.data.data || []);
      setMembers(membersResponse.data.data || []);
      setLoanTypes(loanTypesResponse.data.data || []);
      const openPeriod =
        periodsResponse.data.data.find((p) => p.status === "open")?.id || "";
      setSelectedPeriod(openPeriod);
      const defaultLoan = loanTypesResponse.data.data.find(
        (type) => type.id === 1
      );
      if (defaultLoan) {
        setLoanData((prev) => ({ ...prev, loanTypeId: defaultLoan.id }));
      }
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load initial data.",
        type: "error",
      });
      console.error("Fetch Initial Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDetails = async (memberId) => {
    try {
      const [balanceResponse, loansResponse] = await Promise.all([
        api.get(`/members/${memberId}/balances`, { headers: authHeader }),
        api.get(`/members/${memberId}/loans`, { headers: authHeader }),
      ]);
      console.log("Member Details:", {
        balances: balanceResponse.data,
        loans: loansResponse.data,
      });
      setMemberDetails({
        balances: balanceResponse.data.data,
        loans: loansResponse.data.data.loans || [],
        totalOutstandingBalance:
          loansResponse.data.data.totalOutstandingBalance || 0,
      });
    } catch (err) {
      setDialog({
        message:
          err.response?.data?.message || "Failed to load member details.",
        type: "error",
      });
      console.error("Fetch Member Details Error:", err);
    }
  };

  const fetchPendingLoans = async (periodId) => {
    try {
      setTableLoading(true);
      const response = await api.get(`/loans/period/${periodId}/pending`, {
        headers: authHeader,
      });
      console.log(
        "Pending loans for period",
        periodId,
        ":",
        response.data.data
      );
      setPendingLoans(response.data.data || []);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to load pending loans.",
        type: "error",
      });
      console.error("Fetch Pending Loans Error:", err);
    } finally {
      setTableLoading(false);
    }
  };

  const fetchTotalLoansForMonth = async (periodId) => {
    try {
      const period = periods.find((p) => p.id === periodId);
      if (!period) {
        console.warn(`Period ${periodId} not found`);
        setTotalLoansForMonth(0);
        return;
      }
      const startDate = new Date(period.start_date);
      console.log(
        "Period start_date:",
        period.start_date,
        "Parsed Date:",
        startDate
      );
      if (isNaN(startDate.getTime())) {
        console.error(
          `Invalid start_date for period ${periodId}: ${period.start_date}`
        );
        setTotalLoansForMonth(0);
        return;
      }
      const month = startDate.getMonth() + 1; // Months are 0-indexed
      const year = startDate.getFullYear();
      const response = await api.get(`/loans/monthly/${year}/${month}`, {
        headers: authHeader,
      });
      console.log("Monthly Loans Response:", response.data);
      const loans = response.data.data || [];
      const total = loans.reduce(
        (sum, loan) => sum + (parseFloat(loan.amount) || 0),
        0
      );
      setTotalLoansForMonth(total);
      console.log("Updated totalLoansForMonth:", total);
    } catch (err) {
      setDialog({
        message:
          err.response?.data?.message || "Failed to load monthly loans total.",
        type: "error",
      });
      console.error("Fetch Monthly Loans Error:", err);
      setTotalLoansForMonth(0);
    }
  };

  const fetchTotalLoansForPeriod = async (periodId) => {
    try {
      const response = await api.get(`/loans/period/${periodId}/total`, {
        headers: authHeader,
      });
      console.log("Total Loans For Period Response:", response.data);
      const total = parseFloat(response.data.data.totalAmount) || 0;
      console.log(`Parsed total loans for period ${periodId}:`, total);
      return total;
    } catch (err) {
      setDialog({
        message:
          err.response?.data?.message ||
          `Failed to load total loans for period ${periodId}.`,
        type: "error",
      });
      console.error("Fetch Total Loans Error:", err);
      return 0;
    }
  };

  const deleteLoan = async (loanId) => {
    setConfirmDelete({ show: true, loanId });
  };

  const handleConfirmDelete = async (confirmed) => {
    if (confirmed && confirmDelete.loanId) {
      try {
        await api.delete(`/loans/${confirmDelete.loanId}`, {
          headers: authHeader,
        });
        setDialog({
          message: `Loan ID ${confirmDelete.loanId} deleted successfully!`,
          type: "success",
        });
        await fetchPendingLoans(selectedPeriod);
        await fetchTotalLoansForMonth(selectedPeriod);
        const newPeriodTotal = await fetchTotalLoansForPeriod(selectedPeriod);
        setTotalLoansForPeriod(newPeriodTotal);
        console.log("After Delete - totalLoansForPeriod:", newPeriodTotal);
      } catch (err) {
        setDialog({
          message: err.response?.data?.message || "Failed to delete loan.",
          type: "error",
        });
        console.error("Delete Loan Error:", err);
      }
    }
    setConfirmDelete({ show: false, loanId: null });
  };

  const handleEditLoan = (loan) => {
    setEditLoan({
      id: loan.id,
      loanTypeId: loanTypes.find((lt) => lt.name === loan.loan_type)?.id || "",
      amount: loan.amount.toString(),
      grantDate: loan.grant_date ? new Date(loan.grant_date) : null, // Initialize with existing grant date
    });
    // Reset edit cursor position
    cursorPositions.current.edit = null;
  };

  const handleEditLoanChange = (e) => {
    const { name, value } = e.target;
    if (name === "amount") {
      const input = e.target;
      const cursorPosition = input.selectionStart;

      // Remove all formatting to get raw value
      let rawValue = value.replace(/[^0-9.]/g, "");
      const parts = rawValue.split(".");
      if (parts.length > 2) rawValue = `${parts[0]}.${parts.slice(1).join("")}`;
      if (parts[1]?.length > 2)
        rawValue = `${parts[0]}.${parts[1].slice(0, 2)}`;

      // Calculate how many formatting characters were before the cursor
      const beforeCursor = value.substring(0, cursorPosition);
      const formattingCharsBefore = beforeCursor.replace(/[0-9.]/g, "").length;

      // Calculate the actual cursor position in the raw value
      const actualCursorPosition = cursorPosition - formattingCharsBefore;

      // Store the cursor position relative to the raw value
      cursorPositions.current.edit = Math.max(0, actualCursorPosition);

      setEditLoan((prev) => ({ ...prev, [name]: rawValue }));

      // Restore cursor position for amount field
      setTimeout(() => {
        if (editAmountRef.current && cursorPositions.current.edit !== null) {
          // Calculate the new cursor position in the formatted value
          const displayValue = rawValue
            ? formatNGN(rawValue).replace("NGN", "").trim()
            : "";
          const beforeCursorFormatted = displayValue.substring(
            0,
            cursorPositions.current.edit
          );
          const formattingCharsInFormatted = beforeCursorFormatted.replace(
            /[0-9.]/g,
            ""
          ).length;
          const newCursorPosition =
            cursorPositions.current.edit + formattingCharsInFormatted;

          editAmountRef.current.setSelectionRange(
            newCursorPosition,
            newCursorPosition
          );
        }
      }, 0);
    } else {
      setEditLoan((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEditDateChange = (date) => {
    setEditLoan((prev) => ({ ...prev, grantDate: date }));
  };

  const handleEditLoanSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!editLoan.loanTypeId || !editLoan.amount || !editLoan.grantDate) {
        throw new Error("Loan type, amount, and grant date are required.");
      }

      const selectedLoanType = loanTypes.find(
        (lt) => lt.id === parseInt(editLoan.loanTypeId)
      );
      if (!selectedLoanType) throw new Error("Invalid loan type selected.");

      const payload = {
        loanType: selectedLoanType.name,
        amount: parseFloat(editLoan.amount),
        interestRate: selectedLoanType.interest_rate,
        grantDate: editLoan.grantDate.toISOString().split("T")[0], // Send date as YYYY-MM-DD
      };

      const response = await api.put(`/loans/${editLoan.id}`, payload, {
        headers: authHeader,
      });
      console.log("Edit Loan Response:", response.data);

      setDialog({
        message: `Loan ID ${editLoan.id} updated successfully!`,
        type: "success",
      });
      setEditLoan(null);
      // Reset edit cursor position
      cursorPositions.current.edit = null;
      await fetchPendingLoans(selectedPeriod);
      await fetchTotalLoansForMonth(selectedPeriod);
      const newPeriodTotal = await fetchTotalLoansForPeriod(selectedPeriod);
      setTotalLoansForPeriod(newPeriodTotal);
      console.log("After Edit - totalLoansForPeriod:", newPeriodTotal);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to update loan.",
        type: "error",
      });
      console.error(
        "Edit Loan Error:",
        err.response ? err.response.data : err.message
      );
    }
  };

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
  };

  const handleMemberSearch = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    if (!e.target.value) {
      setSelectedMember(null);
      setMemberDetails(null);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setShowDropdown(false);
    setSelectedMember(null);
    setMemberDetails(null);
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member.id);
    setSearchTerm(
      `${member.member_id} - ${member.first_name} ${member.last_name}`
    );
    setShowDropdown(false);
    fetchMemberDetails(member.id);
    if (amountRef.current) {
      amountRef.current.focus();
    }
  };

  const filteredMembers = members.filter((member) =>
    `${member.member_id} - ${member.first_name} ${member.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleLoanChange = (e) => {
    const { name, value } = e.target;
    if (name === "amount") {
      const input = e.target;
      const cursorPosition = input.selectionStart;

      // Remove all formatting to get raw value
      let rawValue = value.replace(/[^0-9.]/g, "");
      const parts = rawValue.split(".");
      if (parts.length > 2) rawValue = `${parts[0]}.${parts.slice(1).join("")}`;
      if (parts[1]?.length > 2)
        rawValue = `${parts[0]}.${parts[1].slice(0, 2)}`;

      // Calculate how many formatting characters were before the cursor
      const beforeCursor = value.substring(0, cursorPosition);
      const formattingCharsBefore = beforeCursor.replace(/[0-9.]/g, "").length;

      // Calculate the actual cursor position in the raw value
      const actualCursorPosition = cursorPosition - formattingCharsBefore;

      // Store the cursor position relative to the raw value
      cursorPositions.current.main = Math.max(0, actualCursorPosition);

      setLoanData((prev) => ({ ...prev, [name]: rawValue }));

      // Restore cursor position for amount field
      setTimeout(() => {
        if (amountRef.current && cursorPositions.current.main !== null) {
          // Calculate the new cursor position in the formatted value
          const displayValue = rawValue
            ? formatNGN(rawValue).replace("NGN", "").trim()
            : "";
          const beforeCursorFormatted = displayValue.substring(
            0,
            cursorPositions.current.main
          );
          const formattingCharsInFormatted = beforeCursorFormatted.replace(
            /[0-9.]/g,
            ""
          ).length;
          const newCursorPosition =
            cursorPositions.current.main + formattingCharsInFormatted;

          amountRef.current.setSelectionRange(
            newCursorPosition,
            newCursorPosition
          );
        }
      }, 0);
    } else {
      setLoanData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (date) => {
    setLoanData((prev) => ({ ...prev, grantDate: date }));
  };

  const formatNGN = (value) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDialog(null);

    try {
      if (!selectedPeriod) throw new Error("Please select a period.");
      if (!selectedMember) throw new Error("Please select a member.");
      if (!loanData.loanTypeId || !loanData.amount)
        throw new Error("Loan type and amount are required.");
      if (!loanData.grantDate)
        throw new Error("Please select a grant/approval date.");

      const selectedLoanType = loanTypes.find(
        (lt) => lt.id === parseInt(loanData.loanTypeId)
      );
      if (!selectedLoanType) throw new Error("Invalid loan type selected.");

      const payload = {
        memberId: selectedMember,
        periodId: selectedPeriod,
        loanType: selectedLoanType.name,
        amount: parseFloat(loanData.amount),
        interestRate: selectedLoanType.interest_rate,
        grantDate: loanData.grantDate.toISOString().split("T")[0], // Send date as YYYY-MM-DD
      };

      const response = await api.post("/loans/grant", payload, {
        headers: authHeader,
      });
      console.log("Grant Loan Response:", response.data);

      setDialog({
        message: `Loan of ${formatNGN(
          loanData.amount
        )} granted to member ${searchTerm} successfully!`,
        type: "success",
      });
      setLoanData({
        loanTypeId: loanTypes.find((type) => type.id === 1)?.id || "",
        amount: "",
        grantDate: null,
      });
      // Reset main cursor position
      cursorPositions.current.main = null;
      await fetchMemberDetails(selectedMember);
      await fetchPendingLoans(selectedPeriod);
      await fetchTotalLoansForMonth(selectedPeriod);
      const newPeriodTotal = await fetchTotalLoansForPeriod(selectedPeriod);
      setTotalLoansForPeriod(newPeriodTotal);
      console.log("After Grant - totalLoansForPeriod:", newPeriodTotal);
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to grant loan.",
        type: "error",
      });
      console.error("Grant Loan Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isPeriodProcessed = () => {
    const period = periods.find((p) => p.id === selectedPeriod);
    return period && period.status !== "open";
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Loan Processing
        </motion.h1>

        {dialog && (
          <Dialog
            message={dialog.message}
            type={dialog.type}
            onClose={() => setDialog(null)}
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
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl shadow-md p-5 mb-6"
            >
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Period
              </label>
              <select
                value={selectedPeriod}
                onChange={handlePeriodChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                aria-label="Select period"
              >
                <option value="">Select Period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({period.status})
                  </option>
                ))}
              </select>
            </motion.div>

            {tableLoading ? (
              <div className="flex justify-center items-center h-32 mt-6">
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
            ) : pendingLoans.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-md p-5 mb-6 overflow-x-auto"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Pending Loans for Period
                </h2>
                <p className="text-sm sm:text-base font-medium text-gray-700 mb-3">
                  Total Amount for Period: {formatNGN(totalLoansForPeriod)}
                </p>
                <p className="text-sm sm:text-base font-medium text-gray-700 mb-3">
                  Total Loans Granted This Month:{" "}
                  {formatNGN(totalLoansForMonth)}
                </p>
                <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Loan Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Interest
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                        Approved
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingLoans.map((loan) => {
                      const member = members.find(
                        (m) => m.id === loan.member_id
                      );
                      return (
                        <tr key={loan.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs sm:text-sm text-gray-600">
                            {member
                              ? `${member.member_id} - ${member.first_name} ${member.last_name}`
                              : "Unknown"}
                          </td>
                          <td className="px-3 py-2 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                            {loan.loan_type}
                          </td>
                          <td className="px-3 py-2 text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                            {formatNGN(loan.amount)}
                          </td>
                          <td className="px-3 py-2 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                            {loan.interest_rate}%
                          </td>
                          <td className="px-3 py-2 text-xs sm:text-sm text-gray-600 hidden xl:table-cell">
                            {new Date(loan.grant_date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-right text-xs sm:text-sm space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleEditLoan(loan)}
                              className="text-blue-600 hover:text-blue-800"
                              aria-label={`Edit loan ${loan.id}`}
                            >
                              Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => deleteLoan(loan.id)}
                              className="text-red-600 hover:text-red-800"
                              aria-label={`Delete loan ${loan.id}`}
                            >
                              Delete
                            </motion.button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-md p-5 mb-6 text-xs sm:text-sm text-gray-600"
              >
                No pending loans found for the selected period.
                {selectedPeriod && (
                  <p className="mt-2">
                    Total Loans Granted This Month:{" "}
                    {formatNGN(totalLoansForMonth)}
                  </p>
                )}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-md p-5 space-y-5"
            >
              {isPeriodProcessed() ? (
                <p className="text-sm text-gray-600">
                  This period is already processed. You cannot grant new loans.
                </p>
              ) : (
                <>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Member
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={handleMemberSearch}
                        placeholder="Search by member ID or name..."
                        className="w-full max-w-[100vw] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        aria-label="Search member"
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
                    {showDropdown &&
                      searchTerm &&
                      filteredMembers.length > 0 && (
                        <ul className="absolute z-10 w-full max-w-[90vw] bg-white border border-gray-200 rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto">
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

                  {memberDetails && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                        Member Financial Details
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                        <p>
                          <strong className="text-gray-700">
                            Total Shares:
                          </strong>{" "}
                          {memberDetails.balances?.total_shares
                            ? formatNGN(memberDetails.balances.total_shares)
                            : "₦0"}
                        </p>
                        <p>
                          <strong className="text-gray-700">
                            Total Savings:
                          </strong>{" "}
                          {memberDetails.balances?.total_savings
                            ? formatNGN(memberDetails.balances.total_savings)
                            : "₦0"}
                        </p>
                        <p className="sm:col-span-2">
                          <strong className="text-gray-700">
                            Total Outstanding:
                          </strong>{" "}
                          {memberDetails.totalOutstandingBalance
                            ? formatNGN(memberDetails.totalOutstandingBalance)
                            : "₦0"}
                        </p>
                      </div>
                      {memberDetails.loans.length > 0 && (
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-gray-700 mt-4">
                            Active Loans
                          </h3>
                          <ul className="space-y-3 mt-2">
                            {memberDetails.loans.map((loan) => (
                              <li
                                key={loan.id}
                                className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs sm:text-sm"
                              >
                                <p>
                                  <strong className="text-gray-700">
                                    Type:
                                  </strong>{" "}
                                  {loan.loan_type}
                                </p>
                                <p>
                                  <strong className="text-gray-700">
                                    Amount:
                                  </strong>{" "}
                                  {formatNGN(loan.amount)}
                                </p>
                                <p>
                                  <strong className="text-gray-700">
                                    Outstanding:
                                  </strong>{" "}
                                  {formatNGN(loan.outstanding_balance)}
                                </p>
                                <p>
                                  <strong className="text-gray-700">
                                    Interest Rate:
                                  </strong>{" "}
                                  {loan.interest_rate}%
                                </p>
                                <p>
                                  <strong className="text-gray-700">
                                    Status:
                                  </strong>{" "}
                                  {loan.status}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Loan Type
                        </label>
                        <select
                          name="loanTypeId"
                          value={loanData.loanTypeId}
                          onChange={handleLoanChange}
                          required
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          aria-label="Select loan type"
                        >
                          <option value="">Select Loan Type</option>
                          {loanTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name} ({type.interest_rate}%)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Loan Amount (₦)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                            ₦
                          </span>
                          <input
                            type="text"
                            name="amount"
                            value={
                              loanData.amount
                                ? formatNGN(loanData.amount)
                                    .replace("NGN", "")
                                    .trim()
                                : ""
                            }
                            onChange={handleLoanChange}
                            required
                            ref={amountRef}
                            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-right"
                            placeholder="0.00"
                            aria-label="Loan amount"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Grant/Approval Date
                        </label>
                        <DatePicker
                          selected={loanData.grantDate}
                          onChange={handleDateChange}
                          dateFormat="yyyy-MM-dd"
                          placeholderText="Select date"
                          required
                          ref={dateRef}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          aria-label="Select grant/approval date"
                        />
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={loading || !selectedPeriod || !selectedMember}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg shadow-md hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 text-sm min-w-[160px] flex items-center justify-center"
                      aria-label="Grant loan"
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
                          Granting...
                        </span>
                      ) : (
                        "Grant Loan"
                      )}
                    </motion.button>
                  </form>
                </>
              )}
            </motion.div>

            {editLoan && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50"
              >
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Edit Loan (ID: {editLoan.id})
                  </h3>
                  <form onSubmit={handleEditLoanSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loan Type
                      </label>
                      <select
                        name="loanTypeId"
                        value={editLoan.loanTypeId}
                        onChange={handleEditLoanChange}
                        required
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        aria-label="Select loan type for edit"
                      >
                        <option value="">Select Loan Type</option>
                        {loanTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name} ({type.interest_rate}%)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loan Amount (₦)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                          ₦
                        </span>
                        <input
                          type="text"
                          name="amount"
                          value={
                            editLoan.amount
                              ? formatNGN(editLoan.amount)
                                  .replace("NGN", "")
                                  .trim()
                              : ""
                          }
                          onChange={handleEditLoanChange}
                          required
                          ref={editAmountRef}
                          className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-right"
                          placeholder="0.00"
                          aria-label="Edit loan amount"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grant/Approval Date
                      </label>
                      <DatePicker
                        selected={editLoan.grantDate}
                        onChange={handleEditDateChange}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        required
                        ref={dateRef}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        aria-label="Edit grant/approval date"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => setEditLoan(null)}
                        className="px-4 py-2 rounded-lg text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Save Changes
                      </motion.button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            <DeleteConfirmation
              isOpen={confirmDelete.show}
              onClose={() => handleConfirmDelete(false)}
              onConfirm={() => handleConfirmDelete(true)}
              id={confirmDelete.loanId}
              type="loan"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default LoanProcessing;
