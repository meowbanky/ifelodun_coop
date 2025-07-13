import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import DeleteConfirmation from "../components/DeleteConfirmation";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog"; // Import the Dialog component

const ContributionEntry = () => {
  const [contributions, setContributions] = useState([
    { memberId: "", amount: "" },
  ]);
  const [members, setMembers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [currentContributions, setCurrentContributions] = useState([]);
  const [searchTerms, setSearchTerms] = useState([""]);
  const [showDropdown, setShowDropdown] = useState([false]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [dialog, setDialog] = useState(null); // State to control Dialog visibility
  const [confirmDelete, setConfirmDelete] = useState({
    show: false,
    contributionId: null,
  });

  const amountRefs = useRef([]);
  const cursorPositions = useRef([]);

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchCurrentContributions(selectedPeriod);
    } else {
      setCurrentContributions([]);
    }
  }, [selectedPeriod]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [membersResponse, periodsResponse] = await Promise.all([
        api.get("/members/list", { headers: authHeader }),
        api.get("/periods/list", { headers: authHeader }),
      ]);
      console.log("Members Response:", membersResponse.data);
      console.log("Periods Response:", periodsResponse.data);
      setMembers(membersResponse.data.data || []);
      setPeriods(periodsResponse.data.data || []);
      const openPeriod =
        periodsResponse.data.data.find((p) => p.status === "open")?.id || "";
      setSelectedPeriod(openPeriod);
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

  const fetchCurrentContributions = async (periodId) => {
    try {
      setTableLoading(true);
      const response = await api.get(`/contributions/period/${periodId}`, {
        headers: authHeader,
      });
      console.log("Contributions Response:", response.data);
      setCurrentContributions(response.data.data.contributions || []);
    } catch (err) {
      setDialog({
        message:
          err.response?.data?.message ||
          "Failed to load current contributions.",
        type: "error",
      });
      console.error("Fetch Contributions Error:", err);
    } finally {
      setTableLoading(false);
    }
  };

  const deleteContribution = async (contributionId) => {
    setConfirmDelete({ show: true, contributionId });
  };

  const handleConfirmDelete = async (confirmed) => {
    if (confirmed && confirmDelete.contributionId) {
      try {
        await api.delete(`/contributions/${confirmDelete.contributionId}`, {
          headers: authHeader,
        });
        setDialog({
          message: `Contribution ID ${confirmDelete.contributionId} deleted successfully!`,
          type: "success",
        });
        await fetchCurrentContributions(selectedPeriod);
      } catch (err) {
        setDialog({
          message:
            err.response?.data?.message || "Failed to delete contribution.",
          type: "error",
        });
        console.error("Delete Contribution Error:", err);
      }
    }
    setConfirmDelete({ show: false, contributionId: null });
  };

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
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

  const calculateTotalAmount = () => {
    return formatNGN(
      currentContributions.reduce(
        (sum, contrib) => sum + (parseFloat(contrib.amount) || 0),
        0
      )
    );
  };

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    if (name !== "amount") return;

    const input = e.target;
    const cursorPosition = input.selectionStart;

    // Remove formatting to get raw value
    let rawValue = value.replace(/[^0-9.]/g, "");
    const parts = rawValue.split(".");
    if (parts.length > 2) rawValue = `${parts[0]}.${parts.slice(1).join("")}`;
    if (parts[1]?.length > 2) rawValue = `${parts[0]}.${parts[1].slice(0, 2)}`;

    // Calculate how many formatting characters were before the cursor
    const beforeCursor = value.substring(0, cursorPosition);
    const formattingCharsBefore = beforeCursor.replace(/[0-9.]/g, "").length;

    // Calculate the actual cursor position in the raw value
    const actualCursorPosition = cursorPosition - formattingCharsBefore;

    // Store the cursor position relative to the raw value
    cursorPositions.current[index] = Math.max(0, actualCursorPosition);

    const newContributions = [...contributions];
    newContributions[index] = {
      ...newContributions[index],
      [name]: rawValue,
    };
    setContributions(newContributions);

    setTimeout(() => {
      if (
        amountRefs.current[index] &&
        cursorPositions.current[index] !== undefined
      ) {
        // Calculate the new cursor position in the formatted value
        const formattedValue = rawValue
          ? formatNGN(rawValue).replace("NGN", "").trim()
          : "";
        const beforeCursorFormatted = formattedValue.substring(
          0,
          cursorPositions.current[index]
        );
        const formattingCharsInFormatted = beforeCursorFormatted.replace(
          /[0-9.]/g,
          ""
        ).length;
        const newCursorPosition =
          cursorPositions.current[index] + formattingCharsInFormatted;

        amountRefs.current[index].setSelectionRange(
          newCursorPosition,
          newCursorPosition
        );
      }
    }, 0);
  };

  const handleSearchTermChange = (index, e) => {
    const newSearchTerms = [...searchTerms];
    newSearchTerms[index] = e.target.value;
    setSearchTerms(newSearchTerms);

    const newShowDropdown = [...showDropdown];
    newShowDropdown[index] = true;
    setShowDropdown(newShowDropdown);

    const newContributions = [...contributions];
    if (!e.target.value) {
      newContributions[index].memberId = "";
    }
    setContributions(newContributions);
  };

  const handleClearSearch = (index) => {
    const newSearchTerms = [...searchTerms];
    newSearchTerms[index] = "";
    setSearchTerms(newSearchTerms);

    const newShowDropdown = [...showDropdown];
    newShowDropdown[index] = false;
    setShowDropdown(newShowDropdown);

    const newContributions = [...contributions];
    newContributions[index].memberId = "";
    setContributions(newContributions);
  };

  const handleMemberSelect = (index, member) => {
    const newContributions = [...contributions];
    newContributions[index].memberId = member.id;
    setContributions(newContributions);

    const newSearchTerms = [...searchTerms];
    newSearchTerms[
      index
    ] = `${member.member_id} - ${member.first_name} ${member.last_name}`;
    setSearchTerms(newSearchTerms);

    const newShowDropdown = [...showDropdown];
    newShowDropdown[index] = false;
    setShowDropdown(newShowDropdown);

    if (amountRefs.current[index]) {
      amountRefs.current[index].focus();
    }
  };

  const addContribution = () => {
    setContributions([...contributions, { memberId: "", amount: "" }]);
    setSearchTerms([...searchTerms, ""]);
    setShowDropdown([...showDropdown, false]);
    amountRefs.current = [...amountRefs.current, null];
    cursorPositions.current = [...cursorPositions.current, null];
  };

  const removeContribution = (index) => {
    const newContributions = contributions.filter((_, i) => i !== index);
    const newSearchTerms = searchTerms.filter((_, i) => i !== index);
    const newShowDropdown = showDropdown.filter((_, i) => i !== index);
    amountRefs.current = amountRefs.current.filter((_, i) => i !== index);
    cursorPositions.current = cursorPositions.current.filter(
      (_, i) => i !== index
    );
    setContributions(
      newContributions.length > 0
        ? newContributions
        : [{ memberId: "", amount: "" }]
    );
    setSearchTerms(newSearchTerms.length > 0 ? newSearchTerms : [""]);
    setShowDropdown(newShowDropdown.length > 0 ? newShowDropdown : [false]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDialog(null); // Reset dialog

    try {
      if (!selectedPeriod) throw new Error("Please select a period.");

      const validContributions = contributions
        .filter((contrib) => contrib.memberId && contrib.amount)
        .map((contrib) => ({
          memberId: contrib.memberId,
          periodId: selectedPeriod,
          amount: parseFloat(contrib.amount) || 0,
        }));

      if (validContributions.length === 0) {
        throw new Error("No valid contributions to submit.");
      }

      const response = await api.post(
        "/contributions/bulk",
        { contributions: validContributions },
        { headers: authHeader }
      );
      console.log("Submit Response:", response.data);

      setDialog({
        message: "Contributions recorded successfully!",
        type: "success",
      });
      setContributions([{ memberId: "", amount: "" }]);
      setSearchTerms([""]);
      setShowDropdown([false]);
      amountRefs.current = [null];
      cursorPositions.current = [null];
      await fetchCurrentContributions(selectedPeriod);
    } catch (err) {
      setDialog({
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to save contributions.",
        type: "error",
      });
      console.error("Submit Error:", err);
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
          Record Bulk Contributions
        </motion.h1>

        {/* Dialog for feedback */}
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
                aria-label="Select contribution period"
              >
                <option value="">Select Period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({period.status})
                  </option>
                ))}
              </select>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {contributions.map((contrib, index) => {
                const filteredMembers = members.filter((member) =>
                  `${member.member_id} - ${member.first_name} ${member.last_name}`
                    .toLowerCase()
                    .includes(searchTerms[index].toLowerCase())
                );

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative p-4 bg-white rounded-xl shadow-md border border-gray-200"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Search Member
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTerms[index]}
                            onChange={(e) => handleSearchTermChange(index, e)}
                            placeholder="Search by member ID or name..."
                            aria-label={`Search member for contribution ${
                              index + 1
                            }`}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          />
                          {searchTerms[index] && (
                            <button
                              type="button"
                              onClick={() => handleClearSearch(index)}
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
                        {showDropdown[index] && filteredMembers.length > 0 && (
                          <ul className="absolute z-10 w-full max-w-[90vw] sm:max-w-[calc(50%-1rem)] bg-white border border-gray-200 rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto">
                            {filteredMembers.map((member) => (
                              <li
                                key={member.id}
                                onClick={() =>
                                  handleMemberSelect(index, member)
                                }
                                className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer transition-colors"
                              >
                                {member.member_id} - {member.first_name}{" "}
                                {member.last_name}
                              </li>
                            ))}
                          </ul>
                        )}
                        {searchTerms[index] &&
                          filteredMembers.length === 0 &&
                          showDropdown[index] && (
                            <p className="mt-1 text-xs text-gray-500">
                              No members found.
                            </p>
                          )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount (₦)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                            ₦
                          </span>
                          <input
                            type="text"
                            name="amount"
                            value={
                              contrib.amount
                                ? formatNGN(contrib.amount)
                                    .replace("NGN", "")
                                    .trim()
                                : ""
                            }
                            onChange={(e) => handleChange(index, e)}
                            required
                            ref={(el) => (amountRefs.current[index] = el)}
                            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-right"
                            placeholder="0.00"
                            aria-label={`Contribution amount for member ${
                              index + 1
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {contributions.length > 1 && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => removeContribution(index)}
                        className="absolute top-2 right-2 p-1 text-red-600 hover:text-red-800"
                        aria-label="Remove contribution entry"
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
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col sm:flex-row justify-between items-center gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={addContribution}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg shadow-md hover:from-indigo-700 hover:to-blue-800 text-sm min-w-[160px]"
                >
                  Add Another Contribution
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={loading || !selectedPeriod}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg shadow-md hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 text-sm min-w-[160px] flex items-center justify-center"
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
                    "Save Contributions"
                  )}
                </motion.button>
              </motion.div>
            </form>

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
            ) : currentContributions.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-md p-5 mt-6 overflow-x-auto"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Current Contributions for Period
                </h2>
                <p className="text-sm sm:text-base font-medium text-gray-700 mb-3">
                  Total Amount: {calculateTotalAmount()}
                </p>
                <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentContributions.map((contrib) => {
                      const member = members.find(
                        (m) => m.id === contrib.member_id
                      );
                      return (
                        <tr key={contrib.id} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-600">
                            {member
                              ? `${member.member_id} - ${member.first_name} ${member.last_name}`
                              : "Unknown"}
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-600 text-right">
                            {formatNGN(contrib.amount)}
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-right text-xs sm:text-sm">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => deleteContribution(contrib.id)}
                              className="text-red-600 hover:text-red-800"
                              aria-label={`Delete contribution ${contrib.id}`}
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
                className="bg-white rounded-xl shadow-md p-5 mt-6 text-xs sm:text-sm text-gray-600"
              >
                No contributions found for the selected period.
              </motion.div>
            )}

            <DeleteConfirmation
              isOpen={confirmDelete.show}
              onClose={() => handleConfirmDelete(false)}
              onConfirm={() => handleConfirmDelete(true)}
              id={confirmDelete.contributionId}
              type="contribution"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ContributionEntry;
