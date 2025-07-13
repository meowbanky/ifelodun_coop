const pool = require("./config/database");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  const connection = await pool.getConnection();
  try {
    console.log("Running coop_transactions table migration...");
    
    // Read the migration file
    const migrationPath = path.join(__dirname, "migrations", "create_coop_transactions_table.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    
    // Split the SQL into individual statements
    const statements = migrationSQL.split(";").filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log("Executed:", statement.substring(0, 50) + "...");
        } catch (error) {
          if (error.code === "ER_TABLE_EXISTS_ERROR") {
            console.log("Table already exists, skipping...");
          } else {
            console.error("Error executing statement:", error.message);
          }
        }
      }
    }
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

runMigration(); 