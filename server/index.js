const express = require("express");
const cors = require("cors");
require("dotenv").config(); // Removed duplicate
const pool = require("./config/database");
const cron = require("node-cron");

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      "https://ifeloduncms.com.ng",
      "http://localhost:5173",
      "http://192.168.0.13:5173",
    ];

    if (!origin) return callback(null, true); // Allow non-browser requests
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require("./routes/auth.routes");
const memberRoutes = require("./routes/member.routes");
const contributionRoutes = require("./routes/contribution.routes");
const periodRoutes = require("./routes/period.routes");
const loanRoutes = require("./routes/loan.routes");
const loanTypeRoutes = require("./routes/loanType.routes");
const reportRoutes = require("./routes/report.routes");
const notificationRoutes = require("./routes/notification.routes");
const userRoutes = require("./routes/user.routes");
const roleRoutes = require("./routes/role.routes");
const settingsRoutes = require("./routes/settings.routes");
const documentRoutes = require("./routes/documents.routes");
const guarantorRoutes = require("./routes/guarantors.routes");
const commodityRoutes = require("./routes/commodity.routes");
const feeRoutes = require("./routes/fee.routes");
const coopTransactionRoutes = require("./routes/coop_transaction.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const categoryRoutes = require("./routes/category.routes");

// Route mounting
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
console.log("Member routes mounted at /api/members");
app.use("/api/contributions", contributionRoutes);
app.use("/api/periods", periodRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/loan-types", loanTypeRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/guarantors", guarantorRoutes);
app.use("/api/members/:memberId/documents", documentRoutes);
app.use("/api/commodities", commodityRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/coop-transactions", coopTransactionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/categories", categoryRoutes);
console.log("Loan type routes mounted at /api/loan-types");

// Route imports
const authRoutes = require("./routes_mobile/auth.routes");
const memberRoutes = require("./routes_mobile/member");
const periodRoutes = require("./routes_mobile/period");
const profileRoutes = require("./routes_mobile/profile.routes");
const forgotPasswordRoutes = require("./routes_mobile/forgot_password");
const notificationRoutes = require("./routes_mobile/notifications");
const changePasswordRoutes = require("./routes_mobile/change_password");
const deviceRoutes = require("./routes_mobile/device");

// Mount routes
app.use("/mobile_app", authRoutes);
app.use("/mobile_app/member", memberRoutes);
app.use("/mobile_app/period", periodRoutes);
app.use("/mobile_app/profile", profileRoutes);
app.use("/mobile_app", forgotPasswordRoutes);
app.use("/mobile_app/notifications", notificationRoutes);
app.use("/mobile_app/change-password", changePasswordRoutes);
app.use("/mobile_app/device", deviceRoutes);

// Placeholder for notificationTasks (replace with actual import)
// const notificationTasks = require("./tasks/notificationTasks"); // Adjust path as needed

// Cron jobs
// cron.schedule("0 8 * * *", () => {
//   notificationTasks
//     .sendLoanRepaymentReminders()
//     .then((result) => console.log("Reminder task completed:", result))
//     .catch((err) => console.error("Reminder task error:", err));
// });

// cron.schedule("0 9 1 * *", () => {
//   notificationTasks
//     .sendMonthlyStatements()
//     .then((result) => console.log("Monthly statements completed:", result))
//     .catch((err) => console.error("Monthly statements error:", err));
// });

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Database connected successfully");
    connection.release();
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}
testConnection();

// Basic route for testing
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Cooperative API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error", error: err.stack });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
