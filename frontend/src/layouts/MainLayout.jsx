import { useAuth } from "../context/AuthContext";
import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  HomeIcon,
  UsersIcon,
  FolderIcon,
  CalendarIcon,
  ChartBarIcon,
  XMarkIcon,
  Bars3Icon,
  CogIcon,
  ChevronDownIcon,
  ClockIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import { Link, Outlet, useLocation } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Members", href: "/members", icon: UsersIcon },
  { name: "Contributions", href: "/contributions", icon: FolderIcon },
  { name: "Loans", href: "/loans", icon: CalendarIcon },
  { name: "Commodities", href: "/commodities", icon: ShoppingBagIcon },
  {
    name: "Process Monthly Transactions",
    href: "/process/transactions",
    icon: BanknotesIcon,
  },
  { name: "Analytics", href: "/analytics", icon: PresentationChartLineIcon },
  {
    name: "Coop Transactions",
    href: "/coop-transactions",
    icon: BanknotesIcon,
  },
  {
    name: "Reports",
    icon: ChartBarIcon,
    subItems: [
      {
        name: "Spreadsheet Report",
        href: "/reports/custom-spreadsheet-report",
      },
      {
        name: "Member Financial Summary",
        href: "/reports/member-financial-summary",
      },
      { name: "Loan Performance", href: "/reports/loan-performance" },
      { name: "Fee Collection", href: "/reports/fee-collection" },
      {
        name: "Savings and Shares Growth",
        href: "/reports/savings-shares-growth",
      },
      {
        name: "Commodity Transactions",
        href: "/reports/commodity-transactions",
      },
      { name: "Overdue Loans", href: "/reports/overdue-loans" },
      { name: "Interest Summary", href: "/reports/interest-summary" },
      {
        name: "Loan Repayment Summary",
        href: "/reports/loan-repayment-summary",
      },
    ],
  },
  {
    name: "Member Bank Details",
    href: "/members/bank-details",
    icon: BanknotesIcon,
  },
  {
    name: "Withdrawals",
    href: "/withdrawals",
    icon: BanknotesIcon,
  },
  {
    name: "Settings",
    href: "/settings", // Top-level route for SettingsPage
    icon: CogIcon,
    subItems: [
      { name: "Stop Interest", href: "/settings/stop-interest" },
      { name: "Period Creation", href: "/settings/periods", icon: ClockIcon },
      {
        name: "Contributions Setting",
        href: "/settings/contributions/settings",
      },
      { name: "Guarantors Settings", href: "/settings/guarantors/settings" },
      {
        name: "Fee Configuration",
        href: "/settings/fees/config",
        icon: CogIcon,
      },
      { name: "Savings with Loan", href: "/settings/savings-with-loan" },
      {
        name: "Loan Activation Threshold",
        href: "/settings/loan-activation-threshold",
      },
    ],
  },
];

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const location = useLocation();
  const { logout } = useAuth();

  const toggleSubMenu = (name) => {
    setOpenSubMenu(openSubMenu === name ? null : name);
  };

  console.log("MainLayout - Current Path:", location.pathname);

  return (
    <div className="min-h-screen flex">
      {/* Mobile Sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setSidebarOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-gradient-to-b from-indigo-600 to-indigo-800">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </Transition.Child>
                <div className="pt-5 pb-4">
                  <div className="px-4">
                    <h1 className="text-2xl font-bold text-white">
                      IFELODUN (ISALE OKO) C.M.S. LTD
                    </h1>
                    <h2 className="text-2xl font-bold text-white">
                      KARA SABO, SAGAMU OGUN STATE
                    </h2>
                  </div>
                  <nav className="mt-8 px-2 space-y-1 overflow-y-auto h-[calc(100vh-180px)]">
                    {navigation.map((item) => (
                      <div key={item.name}>
                        {item.subItems ? (
                          <>
                            <button
                              onClick={() => toggleSubMenu(item.name)}
                              className={`group flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                item.subItems.some(
                                  (subItem) =>
                                    location.pathname === subItem.href ||
                                    location.pathname.startsWith(subItem.href)
                                ) || location.pathname === item.href
                                  ? "bg-white/10 text-white"
                                  : "text-indigo-100 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <item.icon
                                className={`mr-3 h-6 w-6 flex-shrink-0 ${
                                  item.subItems.some(
                                    (subItem) =>
                                      location.pathname === subItem.href ||
                                      location.pathname.startsWith(subItem.href)
                                  ) || location.pathname === item.href
                                    ? "text-white"
                                    : "text-indigo-200 group-hover:text-white"
                                }`}
                                aria-hidden="true"
                              />
                              {item.name}
                              <ChevronDownIcon
                                className={`ml-auto h-5 w-5 transform transition-transform duration-200 ${
                                  openSubMenu === item.name ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            {openSubMenu === item.name && (
                              <div className="pl-8 space-y-1 mt-1">
                                {item.subItems.map((subItem) => (
                                  <Link
                                    key={subItem.name}
                                    to={subItem.href}
                                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                      location.pathname === subItem.href
                                        ? "bg-white/20 text-white"
                                        : "text-indigo-200 hover:bg-white/10 hover:text-white"
                                    }`}
                                    onClick={() => {
                                      console.log(
                                        "Mobile Nav - Navigating to:",
                                        subItem.href
                                      );
                                      setSidebarOpen(false);
                                    }}
                                  >
                                    <ChartBarIcon
                                      className="mr-3 h-5 w-5 text-indigo-200 group-hover:text-white"
                                      aria-hidden="true"
                                    />
                                    {subItem.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <Link
                            to={item.href}
                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                              location.pathname === item.href
                                ? "bg-white/10 text-white"
                                : "text-indigo-100 hover:bg-white/10 hover:text-white"
                            }`}
                            onClick={() => {
                              console.log(
                                "Mobile Nav - Navigating to:",
                                item.href
                              );
                              setSidebarOpen(false);
                            }}
                          >
                            <item.icon
                              className={`mr-3 h-6 w-6 flex-shrink-0 ${
                                location.pathname === item.href
                                  ? "text-white"
                                  : "text-indigo-200 group-hover:text-white"
                              }`}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 flex-shrink-0" />
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col h-full bg-gradient-to-b from-indigo-600 to-indigo-800 pt-5 shadow-lg">
          <div className="px-6">
            <h1 className="text-lg font-bold text-white">
              IFELODUN (ISALE OKO) C.M.S. LTD
            </h1>
            <h2 className="text-lg font-bold text-white">
              KARA SABO, SAGAMU OGUN STATE
            </h2>
          </div>
          <nav className="mt-8 flex-1 px-2 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.subItems ? (
                  <>
                    <button
                      onClick={() => toggleSubMenu(item.name)}
                      className={`group flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                        item.subItems.some(
                          (subItem) =>
                            location.pathname === subItem.href ||
                            location.pathname.startsWith(subItem.href)
                        ) || location.pathname === item.href
                          ? "bg-white/10 text-white"
                          : "text-indigo-100 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-6 w-6 flex-shrink-0 ${
                          item.subItems.some(
                            (subItem) =>
                              location.pathname === subItem.href ||
                              location.pathname.startsWith(subItem.href)
                          ) || location.pathname === item.href
                            ? "text-white"
                            : "text-indigo-200 group-hover:text-white"
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                      <ChevronDownIcon
                        className={`ml-auto h-5 w-5 transform transition-transform duration-200 ${
                          openSubMenu === item.name ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {openSubMenu === item.name && (
                      <div className="pl-8 space-y-1 mt-1">
                        {item.subItems.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                              location.pathname === subItem.href
                                ? "bg-white/20 text-white"
                                : "text-indigo-200 hover:bg-white/10 hover:text-white"
                            }`}
                            onClick={() =>
                              console.log(
                                "Desktop Nav - Navigating to:",
                                subItem.href
                              )
                            }
                          >
                            <ChartBarIcon
                              className="mr-3 h-5 w-5 text-indigo-200 group-hover:text-white"
                              aria-hidden="true"
                            />
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      location.pathname === item.href
                        ? "bg-white/10 text-white"
                        : "text-indigo-100 hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() =>
                      console.log("Desktop Nav - Navigating to:", item.href)
                    }
                  >
                    <item.icon
                      className={`mr-3 h-6 w-6 flex-shrink-0 ${
                        location.pathname === item.href
                          ? "text-white"
                          : "text-indigo-200 group-hover:text-white"
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 flex-1">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 bg-white shadow-sm px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 text-sm font-semibold text-gray-900">
            {navigation
              .flatMap((item) => (item.subItems ? item.subItems : item))
              .find((item) => location.pathname === item.href)?.name ||
              navigation.find((item) => location.pathname === item.href)
                ?.name ||
              "Dashboard"}
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <Breadcrumb />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
