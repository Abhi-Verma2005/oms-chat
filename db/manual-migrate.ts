import { config } from "dotenv";
import postgres from "postgres";
import fs from "fs";
import path from "path";

config({
  path: ".env.local",
});

const runManualMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });

  console.log("⏳ Running manual migration for chat summary fields...");

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), "lib/drizzle/0003_add_chat_summary_fields.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Execute the migration
    await connection.unsafe(migrationSQL);

    console.log("✅ Manual migration completed successfully");
  } catch (error: any) {
    // If columns already exist, that's okay
    if (error.message?.includes("already exists") || error.code === "42701") {
      console.log("⚠️  Columns may already exist, continuing...");
    } else {
      console.error("❌ Manual migration failed:", error);
      throw error;
    }
  } finally {
    await connection.end();
    process.exit(0);
  }
};

runManualMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});

