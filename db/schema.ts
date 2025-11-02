import { Message } from "ai";
import { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  integer,
} from "drizzle-orm/pg-core";

// Chat table - references external user ID (no foreign key constraint)
export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  messages: json("messages").notNull(),
  userId: varchar("userId", { length: 255 }).notNull(), // External user ID from external database
  title: varchar("title", { length: 255 }), // Chat title
  summary: varchar("summary", { length: 2000 }), // Summarized older messages
  updatedAt: timestamp("updatedAt").notNull().defaultNow(), // Last update time
});

export type Chat = Omit<InferSelectModel<typeof chat>, "messages"> & {
  messages: Array<Message>;
};

// Execution Plan table
export const executionPlan = pgTable("ExecutionPlan", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chatId").notNull().references(() => chat.id, { onDelete: 'cascade' }),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, completed, cancelled
  summary: varchar("summary", { length: 500 }),
  currentStepIndex: integer("currentStepIndex").notNull().default(0),
  totalSteps: integer("totalSteps").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Plan Step table
export const planStep = pgTable("PlanStep", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("planId").notNull().references(() => executionPlan.id, { onDelete: 'cascade' }),
  stepIndex: integer("stepIndex").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  toolName: varchar("toolName", { length: 100 }).notNull(), // Tool to call for this step
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, executing, completed, failed
  result: json("result"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type ExecutionPlan = InferSelectModel<typeof executionPlan>;
export type PlanStep = InferSelectModel<typeof planStep>;
