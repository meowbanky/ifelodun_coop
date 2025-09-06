#!/usr/bin/env node

require("dotenv").config();
const pool = require("./config/database");

async function testServer() {
  console.log("🧪 Testing server configuration...\n");

  // Check environment variables
  console.log("📋 Environment Variables:");
  console.log("- DB_HOST:", process.env.DB_HOST || "NOT SET");
  console.log("- DB_USER:", process.env.DB_USER || "NOT SET");
  console.log("- DB_NAME:", process.env.DB_NAME || "NOT SET");
  console.log("- DB_PORT:", process.env.DB_PORT || "3306");
  console.log("- JWT_SECRET:", process.env.JWT_SECRET ? "SET" : "NOT SET");
  console.log("- JWT_EXPIRE:", process.env.JWT_EXPIRE || "NOT SET");
  console.log("- NODE_ENV:", process.env.NODE_ENV || "NOT SET");
  console.log("- PORT:", process.env.PORT || "3001");

  console.log("\n🔌 Testing database connection...");

  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connection successful!");

    // Test a simple query
    const [result] = await connection.execute("SELECT 1 as test");
    console.log("✅ Database query test successful:", result);

    // Check if users table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "users"');
    if (tables.length > 0) {
      console.log("✅ Users table exists");

      // Count users
      const [userCount] = await connection.execute(
        "SELECT COUNT(*) as count FROM users"
      );
      console.log("✅ User count:", userCount[0].count);
    } else {
      console.log("❌ Users table does not exist");
    }

    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Error code:", error.code);

    if (error.code === "ECONNREFUSED") {
      console.error("💡 Solution: Make sure your MySQL server is running");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("💡 Solution: Check your database username and password");
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.error("💡 Solution: Check your database name");
    } else if (error.code === "ENOTFOUND") {
      console.error("💡 Solution: Check your database host address");
    }
  }

  console.log("\n🏁 Test completed");
  process.exit(0);
}

testServer().catch(console.error);
