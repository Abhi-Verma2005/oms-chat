import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: ".env.local",
});

export default defineConfig({
  schema: "./lib/drizzle-external/schema.ts",
  out: "./lib/drizzle-external",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.EXTERNAL_DB!,
  },
});



