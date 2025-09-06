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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📝 Request body:", req.body);
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.log("🔍 Query params:", req.query);
  }
  next();
});

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
const bankStatementRoutes = require("./routes/bankStatement.routes");

// Route mounting
app.use("/auth", authRoutes);
app.use("/members", memberRoutes);
console.log("Member routes mounted at /members");
app.use("/contributions", contributionRoutes);
app.use("/periods", periodRoutes);
app.use("/loans", loanRoutes);
app.use("/loan-types", loanTypeRoutes);
app.use("/reports", reportRoutes);
app.use("/notifications", notificationRoutes);
app.use("/users", userRoutes);
app.use("/roles", roleRoutes);
app.use("/settings", settingsRoutes);
app.use("/documents", documentRoutes);
app.use("/guarantors", guarantorRoutes);
app.use("/members/:memberId/documents", documentRoutes);
app.use("/commodities", commodityRoutes);
app.use("/fees", feeRoutes);
app.use("/coop-transactions", coopTransactionRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/categories", categoryRoutes);
app.use("/bank-statements", bankStatementRoutes);
console.log("Loan type routes mounted at /loan-types");

// Mobile route imports
const mobileAuthRoutes = require("./routes_mobile/auth.routes");
const mobileMemberRoutes = require("./routes_mobile/member");
const mobilePeriodRoutes = require("./routes_mobile/period");
const profileRoutes = require("./routes_mobile/profile.routes");
const forgotPasswordRoutes = require("./routes_mobile/forgot_password");
const mobileNotificationRoutes = require("./routes_mobile/notifications");
const changePasswordRoutes = require("./routes_mobile/change_password");
const deviceRoutes = require("./routes_mobile/device");

// Mount mobile routes
app.use("/mobile_app", mobileAuthRoutes);
app.use("/mobile_app/member", mobileMemberRoutes);
app.use("/mobile_app/period", mobilePeriodRoutes);
app.use("/mobile_app/profile", profileRoutes);
app.use("/mobile_app", forgotPasswordRoutes);
app.use("/mobile_app/notifications", mobileNotificationRoutes);
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
    console.log("✅ Database connected successfully");
    connection.release();
  } catch (error) {
    console.error("❌ Error connecting to the database:", error.message);
    console.error("Database connection details:");
    console.error("- Host:", process.env.DB_HOST);
    console.error("- Database:", process.env.DB_NAME);
    console.error("- User:", process.env.DB_USER);
    console.error("- Port:", process.env.DB_PORT || 3306);

    if (error.code === "ECONNREFUSED") {
      console.error("❌ Database server is not running or not accessible");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(
        "❌ Database authentication failed - check username/password"
      );
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.error("❌ Database does not exist");
    } else if (error.code === "ENOTFOUND") {
      console.error(
        "❌ Database host not found - check DB_HOST environment variable"
      );
    }
  }
}
testConnection();

// Basic route for testing
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Cooperative API" });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Global error handler:", err);
  console.error("❌ Error stack:", err.stack);

  // Handle specific error types
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body",
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request entity too large",
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.stack
        : "Something went wrong",
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
