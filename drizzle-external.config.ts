import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: ".env.local",
});

export default defineConfig({
  schema: "./lib/external-schema.ts",
  out: "./lib/drizzle-external",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.EXTERNAL_DB!,
  },
});



