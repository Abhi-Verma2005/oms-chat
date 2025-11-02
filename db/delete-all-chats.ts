import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { chat } from "./schema";

config({
  path: ".env.local",
});

const deleteAllChats = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Deleting all chats from database...");

  try {
    // First, count how many chats exist
    const allChats = await db.select().from(chat);
    const chatCount = allChats.length;
    
    console.log(`📊 Found ${chatCount} chats in database`);
    
    if (chatCount === 0) {
      console.log("ℹ️  No chats to delete");
      await connection.end();
      process.exit(0);
    }
    
    // Delete all chats
    // Note: Execution plans and plan steps will be automatically deleted
    // due to CASCADE foreign key constraints
    await db.delete(chat);
    
    console.log(`✅ Successfully deleted ${chatCount} chat(s)`);
    console.log(`   Note: Related execution plans and plan steps were also deleted (cascade)`);
  } catch (error) {
    console.error("❌ Failed to delete chats:", error);
    throw error;
  } finally {
    await connection.end();
    process.exit(0);
  }
};

deleteAllChats().catch((err) => {
  console.error("❌ Script failed");
  console.error(err);
  process.exit(1);
});
