// eslint-disable-next-line no-unused-vars
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import PropTypes from "prop-types";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// --- Page Imports ---
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layouts/MainLayout";
import Members from "./pages/Members";
import ContributionSettings from "./pages/ContributionSettings";
import GuarantorSettings from "./pages/GuarantorSettings";
import ContributionEntry from "./pages/ContributionEntry";
import LoanProcessing from "./pages/LoanProcessing";
import PeriodCreation from "./pages/PeriodCreation";
import MemberBankDetails from "./pages/MemberBankDetails";
import CommodityEntry from "./pages/CommodityEntry";
import FeeConfiguration from "./pages/FeeConfiguration";
import ProcessMonthlyTransaction from "./pages/ProcessMonthlyTransaction";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage"; // New import
import Home from "./pages/IndexPage";
import About from "./pages/About";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import LoanActivationThreshold from "./pages/LoanActivationThreshold"; // Import LoanActivationThreshold
import StopInterestSettings from "./pages/StopInterestSettings";
import Withdrawals from "./pages/Withdrawals";
import Analytics from "./pages/Analytics";
import CoopTransactions from "./pages/CoopTransactions";
import CategoryManagement from "./pages/CategoryManagement";

// --- Valid Report Types (mirrors ReportsPage.jsx) ---
const validReportTypes = [
  "member-financial-summary",
  "loan-performance",
  "fee-collection",
  "savings-shares-growth",
  "commodity-transactions",
  "overdue-loans",
  "interest-summary",
  "loan-repayment-summary",
  "custom-spreadsheet-report",
];

// --- ProtectedRoute Component ---
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  console.log("ProtectedRoute - Loading:", loading, "User:", user);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span>Loading...</span>
      </div>
    );
  }

  if (!user) {
    console.log("No user, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// --- ReportsPage Wrapper for Validation ---
function ReportsPageWrapper() {
  const { reportType } = useParams();
  if (!validReportTypes.includes(reportType)) {
    console.log(
      `Invalid report type: ${reportType}, redirecting to custom-spreadsheet-report`
    );
    return <Navigate to="/reports/custom-spreadsheet-report" replace />;
  }
  return <ReportsPage />;
}

// --- Settings Sub-Routes ---
function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<SettingsPage />} />
      <Route path="member-settings" element={<SettingsPage />} />
      <Route path="stop-interest" element={<StopInterestSettings />} />
      <Route path="periods" element={<PeriodCreation />} />
      <Route path="contributions/settings" element={<ContributionSettings />} />
      <Route path="guarantors/settings" element={<GuarantorSettings />} />
      <Route path="fees/config" element={<FeeConfiguration />} />
      <Route path="savings-with-loan" element={<SettingsPage />} />{" "}
      <Route
        path="loan-activation-threshold"
        element={<LoanActivationThreshold />}
      />{" "}
      {/* Reuse SettingsPage for savings settings */}
    </Routes>
  );
}

// --- App Component ---
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/commodities" element={<CommodityEntry />} />
            <Route path="/members" element={<Members />} />
            <Route
              path="/members/bank-details"
              element={<MemberBankDetails />}
            />
            <Route path="/contributions" element={<ContributionEntry />} />
            <Route path="/loans" element={<LoanProcessing />} />
            <Route
              path="/process/transactions"
              element={<ProcessMonthlyTransaction />}
            />
            <Route
              path="/reports/:reportType"
              element={<ReportsPageWrapper />}
            />
            <Route path="/settings/*" element={<SettingsRoutes />} />{" "}
            {/* Nested routes under /settings */}
            <Route path="/withdrawals" element={<Withdrawals />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/coop-transactions" element={<CoopTransactions />} />
            <Route path="/categories" element={<CategoryManagement />} />
          </Route>
          {/* Catch-all route */}
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
