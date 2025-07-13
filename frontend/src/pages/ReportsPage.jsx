import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { Form, Table, Row, Col } from "react-bootstrap";
import Select from "react-select";
import Modal from "react-modal";
import { motion } from "framer-motion";
import Dialog from "../components/Dialog"; // Import the Dialog component

// Bind modal to app element for accessibility
Modal.setAppElement("#root");

// Report type mappings
const reportTypeLabels = {
  "member-financial-summary": "Member Financial Summary",
  "loan-performance": "Loan Performance",
  "fee-collection": "Fee Collection",
  "savings-shares-growth": "Savings and Shares Growth",
  "commodity-transactions": "Commodity Transactions",
  "overdue-loans": "Overdue Loans",
  "interest-summary": "Interest Summary",
  "loan-repayment-summary": "Loan Repayment Summary",
  "custom-spreadsheet-report": "Custom Spreadsheet Report",
};

const reportTypeToBackend = {
  "member-financial-summary": "member_financial_summary",
  "loan-performance": "loan_performance",
  "fee-collection": "fee_collection",
  "savings-shares-growth": "savings_shares_growth",
  "commodity-transactions": "commodity_transactions",
  "overdue-loans": "overdue_loans",
  "interest-summary": "interest_summary",
  "loan-repayment-summary": "loan_repayment_summary",
  "custom-spreadsheet-report": "custom_spreadsheet_report",
};

// Format NGN currency
const formatNGN = (value) => {
  if (value == null) return "₦0.00";
  if (typeof value === "string" && value.startsWith("₦")) return value;
  const num = parseFloat(value);
  return isNaN(num)
    ? "₦0.00"
    : num.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
};

// Monetary headers for right-alignment
const monetaryHeaders = [
  "Shares Amount",
  "Shares Balance",
  "Savings Amount",
  "Savings Balance",
  "Loan",
  "Loan Repayment",
  "Loan Balance",
  "Interest Charged",
  "Interest Paid",
  "Unpaid Interest",
  "Commodity Amount",
  "Commodity Repayment",
  "Commodity Balance",
  "D.L./B.L.",
  "Stationery",
  "Entry Fees",
  "Withdrawal",
  "Total",
];

const ReportsPage = () => {
  const { reportType } = useParams();
  const selectedReport = {
    value: reportType,
    label: reportTypeLabels[reportType] || "Custom Spreadsheet Report",
  };

  const [periodFrom, setPeriodFrom] = useState(null);
  const [periodTo, setPeriodTo] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deleteTransactions, setDeleteTransactions] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null); // State to control Dialog visibility
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [periodsRes, membersRes] = await Promise.all([
          api.get("/periods/list", { headers: authHeader }),
          api.get("/members/list", { headers: authHeader }),
        ]);
        setPeriods(
          periodsRes.data.data.map((p) => ({ value: p.id, label: p.name }))
        );
        setMembers(
          membersRes.data.data.map((m) => ({
            value: m.id,
            label: `${m.member_id} - ${m.first_name} ${m.last_name}`,
          }))
        );
        if (!periodsRes.data.data.length || !membersRes.data.data.length) {
          setDialog({
            message: "No periods or members found.",
            type: "error",
          });
        }
      } catch (err) {
        setDialog({
          message: err.response?.data?.message || "Failed to load data.",
          type: "error",
        });
      }
    };
    fetchData();
  }, []);

  const transformReportData = (data) => {
    let transformedData = {
      reportTable: { headers: [], rows: [], member_ids: [], period_ids: [] },
    };

    if (selectedReport.value === "loan-performance" && data.loans) {
      transformedData.reportTable = {
        headers: [
          "Member ID",
          "Name",
          "Loan ID",
          "Amount",
          "Interest Rate",
          "Term (Months)",
          "Status",
          "Total Repaid",
          "Remaining Balance",
        ],
        rows: data.loans.map((loan) => [
          loan.member_id || "N/A",
          `${loan.first_name || "N/A"} ${loan.last_name || "N/A"}`,
          loan.loan_id || "N/A",
          formatNGN(loan.amount),
          (parseFloat(loan.interest_rate || 0) * 100).toFixed(2) + "%",
          loan.term || "N/A",
          loan.status || "N/A",
          formatNGN(loan.total_repaid),
          formatNGN(loan.remaining_balance),
        ]),
        member_ids: data.loans.map((loan) => loan.member_id || "N/A"),
        period_ids: data.loans.map((loan) => loan.period_id || "N/A"), // Added period_ids
      };
    } else if (
      selectedReport.value === "savings-shares-growth" &&
      data.balances
    ) {
      transformedData.reportTable = {
        headers: [
          "Member ID",
          "Name",
          "Period",
          "Savings",
          "Running Savings",
          "Shares",
          "Running Shares",
        ],
        rows: data.balances.map((balance) => [
          balance.member_id || "N/A",
          `${balance.first_name || "N/A"} ${balance.last_name || "N/A"}`,
          balance.period_name || "N/A",
          formatNGN(balance.savings),
          formatNGN(balance.running_savings),
          formatNGN(balance.shares),
          formatNGN(balance.running_shares),
        ]),
        member_ids: data.balances.map((balance) => balance.member_id || "N/A"),
        period_ids: data.balances.map((balance) => balance.period_id || "N/A"), // Added period_ids
      };
    } else if (
      selectedReport.value === "custom-spreadsheet-report" &&
      data.reportTable
    ) {
      transformedData.reportTable = {
        headers: [
          "S/N",
          "Coop Member No",
          "Name",
          "Period",
          "Shares Amount",
          "Shares Balance",
          "Savings Amount",
          "Savings Balance",
          "Loan",
          "Loan Repayment",
          "Loan Balance",
          "Interest Charged",
          "Interest Paid",
          "Unpaid Interest",
          "Commodity Amount",
          "Commodity Repayment",
          "Commodity Balance",
          "D.L./B.L.",
          "Loan Bond",
          "Entry Fees",
          "Withdrawal",
          "Total",
        ],
        rows: data.reportTable.rows.map((row) =>
          row.map((cell, idx) => (idx >= 4 ? formatNGN(cell) : cell || "N/A"))
        ),
        member_ids:
          data.member_ids || data.reportTable.rows.map((_, idx) => idx + 1),
        period_ids:
          data.period_ids || data.reportTable.rows.map((_, idx) => idx + 1),
      };
    } else if (selectedReport.value === "fee-collection" && data.reportTable) {
      transformedData.reportTable = {
        headers: data.reportTable.headers,
        rows: data.reportTable.rows.map((row) => [
          row[0],
          row[1] || "N/A",
          row[2] || "N/A",
          row[3] || "N/A",
          row[4] || "N/A",
          formatNGN(row[5]),
        ]),
        member_ids:
          data.member_ids || data.reportTable.rows.map((_, idx) => idx + 1),
        period_ids:
          data.period_ids || data.reportTable.rows.map((_, idx) => idx + 1),
      };
      transformedData.fees = data.fees;
    } else if (
      selectedReport.value === "interest-summary" &&
      data.reportTable
    ) {
      transformedData.reportTable = {
        headers: data.reportTable.headers,
        rows: data.reportTable.rows.map((row) => [
          row[0],
          row[1] || "N/A",
          row[2] || "N/A",
          row[3] || "N/A",
          formatNGN(row[4]),
          formatNGN(row[5]),
          formatNGN(row[6]),
        ]),
        member_ids:
          data.member_ids || data.reportTable.rows.map((_, idx) => idx + 1),
        period_ids:
          data.period_ids || data.reportTable.rows.map((_, idx) => idx + 1),
      };
      transformedData.interest = data.interest;
    } else if (
      selectedReport.value === "loan-repayment-summary" &&
      data.reportTable
    ) {
      transformedData.reportTable = {
        headers: data.reportTable.headers,
        rows: data.reportTable.rows.map((row) => [
          row[0],
          row[1] || "N/A",
          row[2] || "N/A",
          row[3] || "N/A",
          formatNGN(row[4]),
          formatNGN(row[5]),
          formatNGN(row[6]),
          row[7] || "N/A",
        ]),
        member_ids:
          data.member_ids || data.reportTable.rows.map((_, idx) => idx + 1),
        period_ids:
          data.period_ids || data.reportTable.rows.map((_, idx) => idx + 1),
      };
      transformedData.loan_repayments = data.loan_repayments;
    } else if (
      selectedReport.value === "member-financial-summary" &&
      data.members
    ) {
      transformedData.reportTable = {
        headers: [
          "Member ID",
          "Name",
          "Total Contributions",
          "Total Loans",
          "Total Loan Repaid",
          "Loan Balance",
          "Total Interest Charged",
          "Total Interest Paid",
          "Unpaid Interest",
          "Total Commodity Repaid",
          "Savings",
          "Shares",
        ],
        rows: data.members.map((member) => {
          const contributions =
            member.contributions[0]?.total_contributions || "0.00";
          const loans = member.loans[0]?.total_loans || "0.00";
          const repaid = member.repayments[0]?.total_loan_repaid || "0.00";
          const interestCharged =
            member.interestcharged[0]?.total_interest_charged || "0.00";
          const interestPaid =
            member.interestpaid[0]?.total_interest_paid || "0.00";
          const commodityRepaid =
            member.commodityRepayments[0]?.total_commodity_repaid || "0.00";
          const savings = member.balances[0]?.savings || "0.00";
          const shares = member.balances[0]?.shares || "0.00";
          return [
            member.member_id || "N/A",
            `${member.first_name || "N/A"} ${member.last_name || "N/A"}`,
            formatNGN(contributions),
            formatNGN(loans),
            formatNGN(repaid),
            formatNGN((parseFloat(loans) - parseFloat(repaid)).toFixed(2)),
            formatNGN(interestCharged),
            formatNGN(interestPaid),
            formatNGN(
              (parseFloat(interestCharged) - parseFloat(interestPaid)).toFixed(
                2
              )
            ),
            formatNGN(commodityRepaid),
            formatNGN(savings),
            formatNGN(shares),
          ];
        }),
        member_ids: data.members.map((member) => member.member_id || "N/A"),
        period_ids: data.members.map((member) => member.period_id || "N/A"), // Added period_ids
      };
    } else if (data.reportTable) {
      transformedData.reportTable = {
        ...data.reportTable,
        rows: data.reportTable.rows.map((row) =>
          row.map((cell, idx) =>
            monetaryHeaders.includes(data.reportTable.headers[idx])
              ? formatNGN(cell)
              : cell
          )
        ),
        member_ids:
          data.member_ids || data.reportTable.rows.map((_, idx) => idx + 1),
        period_ids:
          data.period_ids || data.reportTable.rows.map((_, idx) => idx + 1),
      };
    }

    return transformedData;
  };

  const handleGenerateReport = async (e, exportFormat = null) => {
    e.preventDefault();
    if (!periodFrom || !periodTo) {
      setDialog({
        message: "Please select Period From and Period To",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setDialog(null); // Reset dialog
    setReportData(null);
    setSelectedRows([]);
    setSelectAll(false);

    const payload = {
      report_type: reportTypeToBackend[selectedReport.value],
      period_from: periodFrom.value,
      period_to: periodTo.value,
      member_id: selectedMember?.value || null,
      delete_transactions: deleteTransactions,
      export_format: exportFormat,
    };

    try {
      const response = await api.post("/reports/generate", payload, {
        responseType: exportFormat ? "blob" : "json",
        headers: authHeader,
      });

      if (exportFormat === "excel") {
        saveAs(
          response.data,
          `${selectedReport.value}_${periodFrom.value}_to_${periodTo.value}.xlsx`
        );
        setDialog({
          message: "Report exported to Excel successfully.",
          type: "success",
        });
      } else if (exportFormat === "pdf") {
        saveAs(
          response.data,
          `${selectedReport.value}_${periodFrom.value}_to_${periodTo.value}.pdf`
        );
        setDialog({
          message: "Report exported to PDF successfully.",
          type: "success",
        });
      } else {
        setReportData(transformReportData(response.data.data));
        setDialog({
          message: response.data.message || "Report generated successfully.",
          type: "success",
        });
      }
    } catch (err) {
      setDialog({
        message: err.response?.data?.message || "Failed to generate report.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelectedRows = () => {
    if (selectedRows.length === 0) {
      setDialog({
        message: "Please select at least one row to delete transactions.",
        type: "error",
      });
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    setLoading(true);
    setDialog(null); // Reset dialog

    try {
      const payload = {
        report_type: reportTypeToBackend[selectedReport.value],
        period_from: periodFrom?.value,
        period_to: periodTo?.value,
        member_id: selectedMember?.value || null,
        delete_transactions: true,
        selected_rows: selectedRows,
      };
      await api.post("/reports/generate", payload, { headers: authHeader });
      setDialog({
        message: `Deleted transactions for ${selectedRows.length} row(s).`,
        type: "success",
      });
      await handleGenerateReport({ preventDefault: () => {} });
      setSelectedRows([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Delete error:", err);
      setDialog({
        message:
          err.response?.data?.message || "Failed to delete transactions.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
      setSelectAll(false);
    } else {
      const allRows =
        reportData?.reportTable?.rows?.map((_, rowIdx) => ({
          member_id: reportData.reportTable.member_ids[rowIdx],
          period_id: reportData.reportTable.period_ids[rowIdx],
        })) || [];
      setSelectedRows(allRows);
      setSelectAll(true);
    }
  };

  const handleCheckboxChange = (memberId, periodId) => {
    setSelectedRows((prev) => {
      const exists = prev.some(
        (r) => r.member_id === memberId && r.period_id === periodId
      );
      let newRows;
      if (exists) {
        newRows = prev.filter(
          (r) => !(r.member_id === memberId && r.period_id === periodId)
        );
        setSelectAll(false);
      } else {
        newRows = [...prev, { member_id: memberId, period_id: periodId }];
        if (newRows.length === reportData?.reportTable?.rows?.length) {
          setSelectAll(true);
        }
      }
      return newRows;
    });
  };

  const saveAs = (blob, fileName) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const selectStyles = {
    control: (base) => ({
      ...base,
      borderColor: "#d1d5db",
      borderRadius: "0.5rem",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
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
    }),
  };

  const renderReportTable = () => {
    if (
      !reportData?.reportTable?.headers ||
      !reportData.reportTable?.rows?.length
    ) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-gray-500"
        >
          No data available.
        </motion.div>
      );
    }

    const showSelectAll = selectedReport.value === "custom-spreadsheet-report";
    const showDeleteButton = [
      "custom-spreadsheet-report",
      "member-financial-summary",
    ].includes(selectedReport.value);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-6 bg-white rounded-xl shadow-md p-5"
        style={{
          maxWidth: "100vw",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
          {selectedReport.label}
        </h2>
        {showDeleteButton && (
          <div className="flex justify-end mb-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeleteSelectedRows}
              disabled={loading || !selectedRows.length}
              className="py-2 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg shadow-sm hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-sm flex items-center"
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
                  Deleting...
                </span>
              ) : (
                `Delete Selected (${selectedRows.length})`
              )}
            </motion.button>
          </div>
        )}
        <div className="min-w-max scroll-hint">
          <Table
            striped
            bordered
            hover
            responsive
            className="min-w-full text-sm"
          >
            <thead className="bg-gray-50">
              <tr>
                {showSelectAll && (
                  <th className="px-3 py-2">
                    <Form.Check
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      disabled={!reportData.reportTable.rows.length}
                    />
                  </th>
                )}
                {reportData.reportTable.headers.map((header, idx) => (
                  <th
                    key={idx}
                    className={`px-3 py-2 text-xs font-medium text-gray-500 uppercase ${
                      monetaryHeaders.includes(header) ? "text-right" : ""
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {reportData.reportTable.rows.map((row, rowIdx) => {
                const isSelected = selectedRows.some(
                  (r) =>
                    r.member_id === reportData.reportTable.member_ids[rowIdx] &&
                    r.period_id === reportData.reportTable.period_ids[rowIdx]
                );
                return (
                  <tr
                    key={rowIdx}
                    className={`hover:bg-gray-50 ${
                      isSelected ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                  >
                    {showSelectAll && (
                      <td className="px-3 py-2">
                        <Form.Check
                          type="checkbox"
                          checked={selectedRows.some(
                            (r) =>
                              r.member_id ===
                                reportData.reportTable.member_ids[rowIdx] &&
                              r.period_id ===
                                reportData.reportTable.period_ids[rowIdx]
                          )}
                          onChange={() =>
                            handleCheckboxChange(
                              reportData.reportTable.member_ids[rowIdx],
                              reportData.reportTable.period_ids[rowIdx]
                            )
                          }
                        />
                      </td>
                    )}
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className={`px-3 py-2 text-sm text-gray-600 ${
                          monetaryHeaders.includes(
                            reportData.reportTable.headers[cellIdx]
                          )
                            ? "text-right"
                            : ""
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen font-['Inter']">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6"
        >
          {selectedReport.label}
        </motion.h1>

        {/* Dialog for feedback */}
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
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Generate {selectedReport.label}
          </h2>
          <Form onSubmit={(e) => handleGenerateReport(e)}>
            <Row className="g-3 mb-4">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                    Period From
                  </Form.Label>
                  <Select
                    options={periods}
                    value={periodFrom}
                    onChange={setPeriodFrom}
                    placeholder="Select Period From"
                    isSearchable
                    className="text-sm"
                    styles={selectStyles}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                    Period To
                  </Form.Label>
                  <Select
                    options={periods}
                    value={periodTo}
                    onChange={setPeriodTo}
                    placeholder="Select Period To"
                    isSearchable
                    className="text-sm"
                    styles={selectStyles}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="block text-sm font-medium text-gray-700 mb-1">
                    Member (Optional)
                  </Form.Label>
                  <Select
                    options={members}
                    value={selectedMember}
                    onChange={setSelectedMember}
                    placeholder="Select Member"
                    isClearable
                    isSearchable
                    className="text-sm"
                    styles={selectStyles}
                  />
                </Form.Group>
              </Col>
            </Row>
            {selectedReport.value === "member-financial-summary" && (
              <Row className="mb-4">
                <Col xs={12} md={4} className="d-flex align-items-end">
                  <Form.Check
                    type="checkbox"
                    label="Delete Transactions"
                    checked={deleteTransactions}
                    onChange={(e) => setDeleteTransactions(e.target.checked)}
                    disabled={!selectedMember}
                    className="text-sm text-gray-700"
                  />
                </Col>
              </Row>
            )}
            <Row>
              <Col className="flex flex-col sm:flex-row gap-3">
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
                      Generating...
                    </span>
                  ) : (
                    "Generate Report"
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={(e) => handleGenerateReport(e, "excel")}
                  disabled={loading}
                  className="w-full sm:w-auto py-2 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg shadow-sm hover:from-green-700 hover:to-green-800 disabled:opacity-50 text-sm flex items-center justify-center"
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
                      Exporting...
                    </span>
                  ) : (
                    "Export to Excel"
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={(e) => handleGenerateReport(e, "pdf")}
                  disabled={loading}
                  className="w-full sm:w-auto py-2 px-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg shadow-sm hover:from-cyan-700 hover:to-cyan-800 disabled:opacity-50 text-sm flex items-center justify-center"
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
                      Exporting...
                    </span>
                  ) : (
                    "Export to PDF"
                  )}
                </motion.button>
              </Col>
            </Row>
          </Form>
        </motion.div>

        {renderReportTable()}

        <Modal
          isOpen={showDeleteModal}
          onRequestClose={() => setShowDeleteModal(false)}
          contentLabel="Confirm Deletion"
          className="bg-white rounded-xl shadow-xl max-w-[90vw] mx-auto mt-[15vh] p-5"
          overlayClassName="fixed inset-0 bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Confirm Deletion
          </h2>
          <div className="text-sm text-gray-700 mb-4">
            <p>
              <span className="font-semibold text-red-600">Warning:</span> You
              are about to delete{" "}
              <span className="font-bold">{selectedRows.length}</span>{" "}
              transaction(s). This action is{" "}
              <span className="underline text-red-600">irreversible</span>.
            </p>
            <p className="mt-2">Are you sure you want to proceed?</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDeleteModal(false)}
              className="py-2 px-4 bg-gray-300 text-gray-800 rounded-lg shadow-sm hover:bg-gray-400 text-sm"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={confirmDelete}
              className="py-2 px-4 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 text-sm"
            >
              Confirm Delete
            </motion.button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ReportsPage;
