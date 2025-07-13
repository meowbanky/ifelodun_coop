import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Define route names mapping
  const routeNames = {
    dashboard: "Dashboard",
    members: "Members",
    contributions: "Contributions",
    loans: "Loans",
    commodities: "Commodities",
    process: "Process",
    transactions: "Monthly Transactions",
    analytics: "Analytics",
    "coop-transactions": "Coop Transactions",
    reports: "Reports",
    settings: "Settings",
    withdrawals: "Withdrawals",
    "member-financial-summary": "Member Financial Summary",
    "loan-performance": "Loan Performance",
    "fee-collection": "Fee Collection",
    "savings-shares-growth": "Savings & Shares Growth",
    "commodity-transactions": "Commodity Transactions",
    "overdue-loans": "Overdue Loans",
    "interest-summary": "Interest Summary",
    "loan-repayment-summary": "Loan Repayment Summary",
    "custom-spreadsheet-report": "Spreadsheet Report",
    "stop-interest": "Stop Interest Settings",
    periods: "Period Creation",
    "contributions/settings": "Contribution Settings",
    "guarantors/settings": "Guarantor Settings",
    "fees/config": "Fee Configuration",
    "savings-with-loan": "Savings with Loan",
    "loan-activation-threshold": "Loan Activation Threshold",
    "bank-details": "Bank Details",
  };

  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-indigo-600 transition-colors"
      >
        <HomeIcon className="h-4 w-4 mr-1" />
        Home
      </Link>

      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNames[name] || name;

        return (
          <React.Fragment key={name}>
            <ChevronRightIcon className="h-4 w-4" />
            {isLast ? (
              <span className="text-gray-900 font-medium">{displayName}</span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-indigo-600 transition-colors"
              >
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
