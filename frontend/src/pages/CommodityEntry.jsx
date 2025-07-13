import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import DeleteConfirmation from "../components/DeleteConfirmation";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog";

const CommodityEntry = () => {
  const [commodities, setCommodities] = useState([
    { memberId: "", name: "", amount: "", deductionCount: "" },
  ]);
  const [members, setMembers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [currentCommodities, setCurrentCommodities] = useState([]);
  const [searchTerms, setSearchTerms] = useState([""]);
  const [showDropdown, setShowDropdown] = useState([false]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    show: false,
    commodityId: null,
  });

  const amountRefs = useRef([]);
  const nameRefs = useRef([]);
  const cursorPositions = useRef([]);

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchCurrentCommodities(selectedPeriod);
    } else {
      setCurrentCommodities([]);
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
      setError(err.response?.data?.message || "Failed to load initial data.");
      console.error("Fetch Initial Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentCommodities = async (periodId) => {
    try {
      setTableLoading(true);
      const response = await api.get(`/commodities/period/${periodId}`, {
        headers: authHeader,
      });
      console.log("Commodities Response:", response.data);
      setCurrentCommodities(response.data.data.commodities || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load current commodities."
      );
      console.error("Fetch Commodities Error:", err);
    } finally {
      setTableLoading(false);
    }
  };

  const deleteCommodity = async (commodityId) => {
    setConfirmDelete({ show: true, commodityId });
  };

  const handleConfirmDelete = async (confirmed) => {
    if (confirmed && confirmDelete.commodityId) {
      try {
        await api.delete(`/commodities/${confirmDelete.commodityId}`, {
          headers: authHeader,
        });
        setSuccess(
          `Commodity ID ${confirmDelete.commodityId} deleted successfully!`
        );
        await fetchCurrentCommodities(selectedPeriod);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to delete commodity.");
        console.error("Delete Commodity Error:", err);
      }
    }
    setConfirmDelete({ show: false, commodityId: null });
  };

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
  };

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "amount") {
      const input = e.target;
      const cursorPosition = input.selectionStart;
      cursorPositions.current[index] = cursorPosition;
      formattedValue = value.replace(/[^0-9.]/g, "");
      const parts = formattedValue.split(".");
      if (parts.length > 2)
        formattedValue = `${parts[0]}.${parts.slice(1).join("")}`;
      if (parts[1]?.length > 2)
        formattedValue = `${parts[0]}.${parts[1].slice(0, 2)}`;
    } else if (name === "deductionCount") {
      formattedValue = value.replace(/[^0-9]/g, "");
      if (formattedValue && parseInt(formattedValue) < 1) formattedValue = "1";
    }

    const newCommodities = [...commodities];
    newCommodities[index] = {
      ...newCommodities[index],
      [name]: formattedValue,
    };
    setCommodities(newCommodities);

    if (name === "amount") {
      setTimeout(() => {
        if (
          amountRefs.current[index] &&
          cursorPositions.current[index] !== undefined
        ) {
          const newCursorPosition = cursorPositions.current[index];
          amountRefs.current[index].setSelectionRange(
            newCursorPosition,
            newCursorPosition
          );
        }
      }, 0);
    }
  };

  const handleSearchTermChange = (index, e) => {
    const newSearchTerms = [...searchTerms];
    newSearchTerms[index] = e.target.value;
    setSearchTerms(newSearchTerms);

    const newShowDropdown = [...showDropdown];
    newShowDropdown[index] = true;
    setShowDropdown(newShowDropdown);

    const newCommodities = [...commodities];
    if (!e.target.value) {
      newCommodities[index].memberId = "";
    }
    setCommodities(newCommodities);
  };

  const handleClearSearch = (index) => {
    const newSearchTerms = [...searchTerms];
    newSearchTerms[index] = "";
    setSearchTerms(newSearchTerms);

    const newShowDropdown = [...showDropdown];
    newShowDropdown[index] = false;
    setShowDropdown(newShowDropdown);

    const newCommodities = [...commodities];
    newCommodities[index].memberId = "";
    setCommodities(newCommodities);
  };

  const handleMemberSelect = (index, member) => {
    const newCommodities = [...commodities];
    newCommodities[index].memberId = member.id;
    setCommodities(newCommodities);

    const newSearchTerms = [...searchTerms];
    newSearchTerms[
      index
    ] = `${member.member_id} - ${member.first_name} ${member.last_name}`;
    setSearchTerms(newSearchTerms);

    const newShowDropdown = [...showDropdown];
    newShowDropdown[index] = false;
    setShowDropdown(newShowDropdown);

    if (nameRefs.current[index]) {
      nameRefs.current[index].focus();
    }
  };

  const addCommodity = () => {
    setCommodities([
      ...commodities,
      { memberId: "", name: "", amount: "", deductionCount: "" },
    ]);
    setSearchTerms([...searchTerms, ""]);
    setShowDropdown([...showDropdown, false]);
    amountRefs.current = [...amountRefs.current, null];
    nameRefs.current = [...nameRefs.current, null];
    cursorPositions.current = [...cursorPositions.current, null];
  };

  const removeCommodity = (index) => {
    const newCommodities = commodities.filter((_, i) => i !== index);
    const newSearchTerms = searchTerms.filter((_, i) => i !== index);
    const newShowDropdown = showDropdown.filter((_, i) => i !== index);
    amountRefs.current = amountRefs.current.filter((_, i) => i !== index);
    nameRefs.current = nameRefs.current.filter((_, i) => i !== index);
    cursorPositions.current = cursorPositions.current.filter(
      (_, i) => i !== index
    );
    setCommodities(
      newCommodities.length > 0
        ? newCommodities
        : [{ memberId: "", name: "", amount: "", deductionCount: "" }]
    );
    setSearchTerms(newSearchTerms.length > 0 ? newSearchTerms : [""]);
    setShowDropdown(newShowDropdown.length > 0 ? newShowDropdown : [false]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!selectedPeriod) throw new Error("Please select a period.");

      const validCommodities = commodities
        .filter(
          (commodity) =>
            commodity.memberId &&
            commodity.name &&
            commodity.amount &&
            commodity.deductionCount
        )
        .map((commodity) => ({
          memberId: commodity.memberId,
          periodId: selectedPeriod,
          name: commodity.name,
          amount: parseFloat(commodity.amount),
          deductionCount: parseInt(commodity.deductionCount),
        }));

      if (validCommodities.length === 0) {
        throw new Error("No valid commodities to submit.");
      }

      const response = await api.post(
        "/commodities/bulk",
        { commodities: validCommodities },
        { headers: authHeader }
      );
      console.log("Submit Response:", response.data);

      setSuccess("Commodities recorded successfully!");
      setCommodities([
        { memberId: "", name: "", amount: "", deductionCount: "" },
      ]);
      setSearchTerms([""]);
      setShowDropdown([false]);
      amountRefs.current = [null];
      nameRefs.current = [null];
      cursorPositions.current = [null];
      await fetchCurrentCommodities(selectedPeriod);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save commodities.");
      console.error("Submit Error:", err);
    } finally {
      setLoading(false);
    }
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
      currentCommodities.reduce(
        (sum, commodity) => sum + (parseFloat(commodity.amount) || 0),
        0
      )
    );
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          Record Bulk Commodities
        </motion.h1>

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
            ) : currentCommodities.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-md p-5 mb-6 overflow-x-auto"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Current Commodities for Period
                </h2>
                <p className="text-sm sm:text-base font-medium text-gray-700 mb-3">
                  Total Amount: {calculateTotalAmount()}
                </p>
                <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Commodity
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Deductions
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentCommodities.map((commodity) => {
                      const member = members.find(
                        (m) => m.id === commodity.member_id
                      );
                      return (
                        <tr key={commodity.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs sm:text-sm text-gray-600">
                            {member
                              ? `${member.member_id} - ${member.first_name} ${member.last_name}`
                              : "Unknown"}
                          </td>
                          <td className="px-3 py-2 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                            {commodity.name}
                          </td>
                          <td className="px-3 py-2 text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                            {formatNGN(commodity.amount)}
                          </td>
                          <td className="px-3 py-2 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                            {commodity.deduction_count}
                          </td>
                          <td className="px-3 py-2 text-right text-xs sm:text-sm">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => deleteCommodity(commodity.id)}
                              className="text-red-600 hover:text-red-800"
                              aria-label={`Delete commodity ${commodity.id}`}
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
                No commodities found for the selected period.
              </motion.div>
            )}

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-xl shadow-md p-5 space-y-5"
            >
              {commodities.map((commodity, index) => {
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
                    className="relative p-4 bg-white rounded-lg border border-gray-200"
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
                            className="w-full max-w-[100vw] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            aria-label={`Search member for commodity ${
                              index + 1
                            }`}
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
                        {showDropdown[index] &&
                          searchTerms[index] &&
                          filteredMembers.length > 0 && (
                            <ul className="absolute z-10 w-full max-w-[90vw] sm:max-w-xs bg-white border border-gray-200 rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto">
                              {filteredMembers.map((member) => (
                                <li
                                  key={member.id}
                                  onClick={() =>
                                    handleMemberSelect(index, member)
                                  }
                                  className="px-2 py-2 text-sm hover:bg-indigo-100 cursor-pointer transition-colors"
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
                          Commodity Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={commodity.name}
                          onChange={(e) => handleChange(index, e)}
                          required
                          placeholder="e.g., Rice"
                          ref={(el) => (nameRefs.current[index] = el)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          aria-label={`Commodity name for commodity ${
                            index + 1
                          }`}
                        />
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
                            value={commodity.amount}
                            onChange={(e) => handleChange(index, e)}
                            required
                            placeholder="0.00"
                            ref={(el) => (amountRefs.current[index] = el)}
                            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            aria-label={`Amount for commodity ${index + 1}`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Deduction Count
                        </label>
                        <input
                          type="number"
                          name="deductionCount"
                          value={commodity.deductionCount}
                          onChange={(e) => handleChange(index, e)}
                          required
                          min="1"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          aria-label={`Deduction count for commodity ${
                            index + 1
                          }`}
                        />
                      </div>
                    </div>

                    {commodities.length > 1 && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => removeCommodity(index)}
                        className="absolute top-2 right-2 p-1 text-red-600 hover:text-red-800"
                        aria-label="Remove commodity entry"
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
                  onClick={addCommodity}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-lg shadow-md hover:from-indigo-700 hover:to-blue-800 text-sm min-w-[160px]"
                >
                  Add Another Commodity
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
                    "Save Commodities"
                  )}
                </motion.button>
              </motion.div>
            </form>

            <DeleteConfirmation
              isOpen={confirmDelete.show}
              onClose={() => handleConfirmDelete(false)}
              onConfirm={() => handleConfirmDelete(true)}
              id={confirmDelete.commodityId}
              type="commodity"
            />

            {/* Dialog Component for Success/Error */}
            {(error || success) && (
              <Dialog
                message={error || success}
                type={error ? "error" : "success"}
                onClose={() => {
                  setError("");
                  setSuccess("");
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommodityEntry;
