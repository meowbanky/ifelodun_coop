const pool = require("./config/database");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  const connection = await pool.getConnection();

  try {
    console.log("Starting bank statement tables migration...");

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      "migrations/create_bank_statement_tables.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Split the SQL into individual statements and clean them
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Log all statements for debugging
    statements.forEach((stmt, index) => {
      console.log(`Statement ${index + 1}: ${stmt.substring(0, 100)}...`);
    });

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(
            `\nExecuting statement ${i + 1}/${
              statements.length
            }: ${statement.substring(0, 50)}...`
          );
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          // Check if it's a "table already exists" error
          if (error.message.includes("already exists")) {
            console.log(
              `⚠️  Statement ${i + 1} skipped (table already exists)`
            );
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log("\n✅ Bank statement tables migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

runMigration().catch(console.error);
