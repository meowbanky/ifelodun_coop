const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./config/database");

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CLIENT_URL.split(",");
    if (!origin || allowedOrigins.includes(origin)) {
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

// Route imports
const authRoutes = require("./routes/auth.routes");
const memberRoutes = require("./routes/member");
const periodRoutes = require("./routes/period");
const profileRoutes = require("./routes/profile.routes");
const forgotPasswordRoutes = require("./routes/forgot_password");
const notificationRoutes = require("./routes/notifications");
const changePasswordRoutes = require("./routes/change_password");
const deviceRoutes = require("./routes/device");

// Mount routes
app.use("/mobile_app", authRoutes);
app.use("/mobile_app/member", memberRoutes);
app.use("/mobile_app/period", periodRoutes);
app.use("/mobile_app/profile", profileRoutes);
app.use("/mobile_app", forgotPasswordRoutes);
app.use("/mobile_app/notifications", notificationRoutes);
app.use("/mobile_app/change-password", changePasswordRoutes);
app.use("/mobile_app/device", deviceRoutes);

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
app.get("/mobile_app", (req, res) => {
  res.json({ message: "Welcome to Ifelodun Mobile App API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error", error: err.stack });
});

// Listen on the port provided by the host
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
