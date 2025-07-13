import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  UsersIcon,
  BanknotesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const Analytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalContributions: 0,
    totalLoans: 0,
    totalWithdrawals: 0,
    totalIncome: 0,
    totalExpenses: 0,
    overdueLoans: 0,
    pendingLoans: 0,
    recentTransactions: [],
    monthlyContributions: [],
    loanPerformance: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [periods, setPeriods] = useState([]);

  useEffect(() => {
    fetchAnalytics();
    fetchPeriods();
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    try {
      const response = await api.get("/periods/list");
      setPeriods(response.data.data || []);
    } catch (error) {
      console.error("Error fetching periods:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch analytics from backend API
      const response = await api.get(
        `/analytics${
          selectedPeriod !== "all" ? `?periodId=${selectedPeriod}` : ""
        }`
      );
      const data = response.data.data;

      setAnalytics({
        totalMembers: data.members.total,
        activeMembers: data.members.active,
        totalContributions: data.financial.totalContributions,
        totalLoans: data.financial.totalLoans,
        totalWithdrawals: data.financial.totalWithdrawals,
        totalIncome: data.financial.totalIncome,
        totalExpenses: data.financial.totalExpenses,
        overdueLoans: data.loans.overdue,
        pendingLoans: data.loans.pending,
        recentTransactions: data.trends.recentTransactions,
        monthlyContributions: data.trends.monthlyContributions,
        loanPerformance: data.loans.performance,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color = "blue",
  }) => (
    <div className="bg-white rounded-lg shadow p-6 min-w-0">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <p
            className="text-2xl font-semibold text-gray-900 break-words truncate max-w-[10ch] md:max-w-[16ch] lg:max-w-[20ch] xl:max-w-[24ch]"
            style={{ lineHeight: 1.1 }}
          >
            {value}
          </p>
          {trend && (
            <div className="flex items-center mt-1">
              {trend === "up" ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-sm ml-1 ${
                  trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            Overview of cooperative performance and key metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Time</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name}
              </option>
            ))}
          </select>
          <button
            onClick={fetchAnalytics}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Members"
          value={analytics.totalMembers}
          icon={UsersIcon}
          color="blue"
        />
        <StatCard
          title="Active Members"
          value={analytics.activeMembers}
          icon={UsersIcon}
          color="green"
        />
        <StatCard
          title="Total Contributions"
          value={formatCurrency(analytics.totalContributions)}
          icon={BanknotesIcon}
          color="indigo"
        />
        <StatCard
          title="Total Loans"
          value={formatCurrency(analytics.totalLoans)}
          icon={CurrencyDollarIcon}
          color="yellow"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Financial Overview
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Income</span>
              <span className="text-green-600 font-semibold">
                {formatCurrency(analytics.totalIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Expenses</span>
              <span className="text-red-600 font-semibold">
                {formatCurrency(analytics.totalExpenses)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Withdrawals</span>
              <span className="text-orange-600 font-semibold">
                {formatCurrency(analytics.totalWithdrawals)}
              </span>
            </div>
            <hr />
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-semibold">Net Position</span>
              <span
                className={`font-semibold ${
                  analytics.totalIncome - analytics.totalExpenses >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(
                  analytics.totalIncome - analytics.totalExpenses
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Loan Status
          </h3>
          <div className="space-y-4">
            {analytics.loanPerformance.map((item) => (
              <div
                key={item.status}
                className="flex justify-between items-center"
              >
                <span className="text-gray-600">{item.status}</span>
                <span className="font-semibold text-gray-900">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Contributions Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Contributions
          </h3>
          <div className="space-y-3">
            {analytics.monthlyContributions.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-20 text-sm text-gray-600">{item.month}</div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{
                        width: `${Math.max(
                          (item.total_amount /
                            Math.max(
                              ...analytics.monthlyContributions.map(
                                (m) => m.total_amount
                              )
                            )) *
                            100,
                          5
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-24 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(item.total_amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Transactions
          </h3>
          <div className="space-y-3">
            {analytics.recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-semibold ${
                      transaction.type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <p className="text-xs text-gray-500 capitalize">
                    {transaction.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <ChartBarIcon className="h-5 w-5 text-indigo-600 mr-2" />
            <span>Generate Reports</span>
          </button>
          <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <BanknotesIcon className="h-5 w-5 text-green-600 mr-2" />
            <span>Add Transaction</span>
          </button>
          <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <UsersIcon className="h-5 w-5 text-blue-600 mr-2" />
            <span>Manage Members</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
