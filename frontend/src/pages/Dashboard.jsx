"use client";
import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import {
  UsersIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ScaleIcon,
  UserGroupIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const colors = {
  primary: "#1e3a8a",
  secondary: "#10b981",
  accent: "#f59e0b",
  purple: "#8b5cf6",
  gray: "#6b7280",
  teal: "#2dd4bf",
};

function Dashboard() {
  const [stats, setStats] = useState({
    contributions: {
      total_contributions: 0,
      total_savings: 0,
      total_shares: 0,
      contribution_count: 0,
    },
    loans: {
      total_loans: 0,
      total_loan_amount: 0,
      active_balance: 0,
      active_loans: 0,
      pending_loans: 0,
      completed_loans: 0,
    },
    interest: {
      total_interest_charged: 0,
      total_interest_paid: 0,
      total_interest_unpaid: 0,
    },
    repayments: {
      total_loan_repaid: 0,
      total_principal_repaid: 0,
      total_interest_repaid: 0,
      loan_repayment_count: 0,
      total_commodity_repaid: 0,
      commodity_repayment_count: 0,
    },
    members: {
      total_members: 0,
      active_members: 0,
      gender: { male: 0, female: 0, other: 0 },
      status: { active: 0, inactive: 0, suspended: 0 },
    },
    repayment_trend: {},
    generatedAt: "",
  });
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get("/reports/financial/summary", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("Stats:", response.data.data);
      setStats(response.data.data || {});
    } catch (error) {
      console.error("Failed to fetch financial summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNaira = (amount) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amount);

  const exportToPDF = async () => {
    if (!pdfRef.current) {
      console.error("PDF ref is null");
      return;
    }
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        windowWidth: 1024, // Ensure desktop-like rendering
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save("cooperative_dashboard.pdf");
    } catch (error) {
      console.error("PDF export failed:", error);
    }
  };

  const statCards = [
    {
      title: "Total Members",
      value: stats.members.total_members,
      icon: UserGroupIcon,
      gradient: "from-blue-600 to-indigo-700",
    },
    {
      title: "Total Contributions",
      value: formatNaira(stats.contributions.total_contributions),
      icon: BanknotesIcon,
      gradient: "from-green-500 to-emerald-600",
    },
    {
      title: "Active Loans",
      value: formatNaira(stats.loans.active_balance),
      icon: CurrencyDollarIcon,
      gradient: "from-yellow-500 to-amber-600",
    },
    {
      title: "Total Savings",
      value: formatNaira(stats.contributions.total_savings),
      icon: ChartPieIcon,
      gradient: "from-purple-500 to-violet-600",
    },
    {
      title: "Total Loan Repaid",
      value: formatNaira(stats.repayments.total_loan_repaid),
      icon: ArrowTrendingUpIcon,
      gradient: "from-teal-500 to-cyan-600",
    },
    {
      title: "Unpaid Interest",
      value: formatNaira(stats.interest.total_interest_unpaid || 0),
      icon: ScaleIcon,
      gradient: "from-red-500 to-pink-600",
    },
    {
      title: "Active Members",
      value: stats.members.active_members,
      icon: UsersIcon,
      gradient: "from-green-500 to-emerald-600",
    },
    {
      title: "Male Members",
      value: stats.members.gender.male,
      icon: IdentificationIcon,
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      title: "Female Members",
      value: stats.members.gender.female,
      icon: IdentificationIcon,
      gradient: "from-purple-500 to-violet-600",
    },
  ];

  const financialBarChartData = {
    labels: ["Members", "Contributions", "Active Loans", "Savings"],
    datasets: [
      {
        label: "Financial Metrics",
        data: [
          stats.members.total_members,
          stats.contributions.total_contributions,
          stats.loans.active_balance,
          stats.contributions.total_savings,
        ],
        backgroundColor: [
          colors.primary,
          colors.secondary,
          colors.accent,
          colors.purple,
        ],
      },
    ],
  };

  const financialBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Financial Overview",
        font: { size: window.innerWidth < 640 ? 14 : 18 },
      },
      tooltip: {
        bodyFont: { size: window.innerWidth < 640 ? 12 : 14 },
        callbacks: {
          label: (context) =>
            context.label === "Members"
              ? context.raw
              : formatNaira(context.raw),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Value", font: { size: 12 } },
        ticks: { font: { size: window.innerWidth < 640 ? 10 : 12 } },
      },
      x: { ticks: { font: { size: window.innerWidth < 640 ? 10 : 12 } } },
    },
  };

  const loanDoughnutChartData = {
    labels: ["Active", "Pending", "Completed"],
    datasets: [
      {
        data: [
          stats.loans.active_loans,
          stats.loans.pending_loans,
          stats.loans.completed_loans,
        ],
        backgroundColor: [colors.secondary, colors.accent, colors.gray],
        borderWidth: 0,
      },
    ],
  };

  const loanDoughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: window.innerWidth < 640 ? "bottom" : "right",
        labels: { font: { size: window.innerWidth < 640 ? 10 : 12 } },
      },
      title: {
        display: true,
        text: "Loan Status Breakdown",
        font: { size: window.innerWidth < 640 ? 14 : 18 },
      },
      tooltip: { bodyFont: { size: window.innerWidth < 640 ? 12 : 14 } },
    },
  };

  const genderDoughnutChartData = {
    labels: ["Male", "Female", "Other"],
    datasets: [
      {
        data: [
          stats.members.gender.male,
          stats.members.gender.female,
          stats.members.gender.other,
        ],
        backgroundColor: [colors.primary, colors.purple, colors.gray],
        borderWidth: 0,
      },
    ],
  };

  const genderDoughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: window.innerWidth < 640 ? "bottom" : "right",
        labels: { font: { size: window.innerWidth < 640 ? 10 : 12 } },
      },
      title: {
        display: true,
        text: "Gender Distribution",
        font: { size: window.innerWidth < 640 ? 14 : 18 },
      },
      tooltip: { bodyFont: { size: window.innerWidth < 640 ? 12 : 14 } },
    },
  };

  const statusBarChartData = {
    labels: ["Active", "Inactive", "Suspended"],
    datasets: [
      {
        label: "Membership Status",
        data: [
          stats.members.status.active,
          stats.members.status.inactive,
          stats.members.status.suspended,
        ],
        backgroundColor: [colors.secondary, colors.accent, colors.gray],
      },
    ],
  };

  const statusBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Membership Status",
        font: { size: window.innerWidth < 640 ? 14 : 18 },
      },
      tooltip: { bodyFont: { size: window.innerWidth < 640 ? 12 : 14 } },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Count", font: { size: 12 } },
        ticks: { font: { size: window.innerWidth < 640 ? 10 : 12 } },
      },
      x: { ticks: { font: { size: window.innerWidth < 640 ? 10 : 12 } } },
    },
  };

  const repaymentLineChartData = {
    labels: Object.keys(stats.repayment_trend || {})
      .sort()
      .map((date) => {
        const [year, month] = date.split("-");
        return new Date(year, month - 1, 1).toLocaleString("en-US", {
          month: "short",
          year: "2-digit",
        });
      }),
    datasets: [
      {
        label: "Loan Repayments",
        data: Object.keys(stats.repayment_trend || {})
          .sort()
          .map((key) => stats.repayment_trend[key].total_loan_repaid || 0),
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}33`,
        fill: true,
        tension: 0.4,
      },
      {
        label: "Interest Paid",
        data: Object.keys(stats.repayment_trend || {})
          .sort()
          .map((key) => stats.repayment_trend[key].total_interest_repaid || 0),
        borderColor: colors.teal,
        backgroundColor: `${colors.teal}33`,
        fill: true,
        tension: 0.4,
      },
      {
        label: "Interest Unpaid",
        data: Object.keys(stats.repayment_trend || {})
          .sort()
          .map((key) => stats.repayment_trend[key].total_interest_unpaid || 0),
        borderColor: colors.accent,
        backgroundColor: `${colors.accent}33`,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const repaymentLineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: window.innerWidth < 640 ? "bottom" : "top",
        labels: { font: { size: window.innerWidth < 640 ? 10 : 12 } },
      },
      title: {
        display: true,
        text: "Repayment Trends",
        font: { size: window.innerWidth < 640 ? 14 : 18 },
      },
      tooltip: {
        bodyFont: { size: window.innerWidth < 640 ? 12 : 14 },
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${formatNaira(context.raw)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Amount (₦)", font: { size: 12 } },
        ticks: { font: { size: window.innerWidth < 640 ? 10 : 12 } },
      },
      x: { ticks: { font: { size: window.innerWidth < 640 ? 10 : 12 } } },
    },
  };

  return (
    <div
      className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8"
      ref={pdfRef}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-['Inter']">
            Cooperative Dashboard
          </h1>
          <button
            onClick={exportToPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base min-w-[120px]"
            aria-label="Export dashboard as PDF"
          >
            Export PDF
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${card.gradient} rounded-xl shadow-md text-white p-4 sm:p-5`}
            >
              <div className="flex items-center">
                <div className="bg-white/20 rounded-md p-2">
                  <card.icon
                    className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  {loading ? (
                    <div className="space-y-1">
                      <div className="h-2 w-16 sm:h-3 sm:w-20 bg-white/30 rounded animate-pulse" />
                      <div className="h-4 w-10 sm:h-5 sm:w-12 bg-white/30 rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs sm:text-sm font-medium">
                        {card.title}
                      </p>
                      <p className="text-base sm:text-lg font-semibold">
                        {card.value}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          {/* Financial Bar Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-4"
          >
            <div className="h-64 sm:h-80">
              {loading ? (
                <div className="h-full w-full bg-gray-200 rounded animate-pulse" />
              ) : (
                <Bar
                  data={financialBarChartData}
                  options={financialBarChartOptions}
                />
              )}
            </div>
          </motion.div>

          {/* Loan and Gender Doughnut Charts (Stacked on Mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-md p-4"
            >
              <div className="h-64 sm:h-80">
                {loading ? (
                  <div className="h-full w-full bg-gray-200 rounded animate-pulse" />
                ) : (
                  <Doughnut
                    data={loanDoughnutChartData}
                    options={loanDoughnutChartOptions}
                  />
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-md p-4"
            >
              <div className="h-64 sm:h-80">
                {loading ? (
                  <div className="h-full w-full bg-gray-200 rounded animate-pulse" />
                ) : (
                  <Doughnut
                    data={genderDoughnutChartData}
                    options={genderDoughnutChartOptions}
                  />
                )}
              </div>
            </motion.div>
          </div>

          {/* Status Bar Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-md p-4"
          >
            <div className="h-64 sm:h-80">
              {loading ? (
                <div className="h-full w-full bg-gray-200 rounded animate-pulse" />
              ) : (
                <Bar
                  data={statusBarChartData}
                  options={statusBarChartOptions}
                />
              )}
            </div>
          </motion.div>

          {/* Repayment Line Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-md p-4"
          >
            <div className="h-64 sm:h-80">
              {loading ? (
                <div className="h-full w-full bg-gray-200 rounded animate-pulse" />
              ) : (
                <Line
                  data={repaymentLineChartData}
                  options={repaymentLineChartOptions}
                />
              )}
            </div>
          </motion.div>
        </div>

        {/* Summary Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 bg-white rounded-xl shadow-md p-4"
        >
          <h2 className="text-base sm:text-lg font-semibold mb-3">
            Cooperative Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Metric
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  {
                    label: "Total Members",
                    value: stats.members.total_members,
                  },
                  {
                    label: "Active Members",
                    value: stats.members.active_members,
                  },
                  { label: "Male Members", value: stats.members.gender.male },
                  {
                    label: "Female Members",
                    value: stats.members.gender.female,
                  },
                  { label: "Other Gender", value: stats.members.gender.other },
                  {
                    label: "Inactive Members",
                    value: stats.members.status.inactive,
                  },
                  {
                    label: "Suspended Members",
                    value: stats.members.status.suspended,
                  },
                  {
                    label: "Total Contributions",
                    value: formatNaira(stats.contributions.total_contributions),
                  },
                  {
                    label: "Total Savings",
                    value: formatNaira(stats.contributions.total_savings),
                  },
                  {
                    label: "Total Shares",
                    value: formatNaira(stats.contributions.total_shares),
                  },
                  { label: "Total Loans", value: stats.loans.total_loans },
                  {
                    label: "Active Loans",
                    value: formatNaira(stats.loans.active_balance),
                  },
                  { label: "Pending Loans", value: stats.loans.pending_loans },
                  {
                    label: "Completed Loans",
                    value: stats.loans.completed_loans,
                  },
                  {
                    label: "Total Loan Repaid",
                    value: formatNaira(stats.repayments.total_loan_repaid),
                  },
                  {
                    label: "Total Principal Repaid",
                    value: formatNaira(stats.repayments.total_principal_repaid),
                  },
                  {
                    label: "Total Interest Paid",
                    value: formatNaira(stats.repayments.total_interest_repaid),
                  },
                  {
                    label: "Total Interest Unpaid",
                    value: formatNaira(
                      stats.interest.total_interest_unpaid || 0
                    ),
                  },
                  {
                    label: "Total Commodity Repaid",
                    value: formatNaira(stats.repayments.total_commodity_repaid),
                  },
                ].map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {row.label}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {loading ? (
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        row.value
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;
