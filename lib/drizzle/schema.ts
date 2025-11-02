import { sql } from "drizzle-orm";
import { pgTable, uuid, timestamp, json, varchar, integer } from "drizzle-orm/pg-core";




export const chat = pgTable("Chat", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	messages: json().notNull(),
	userId: varchar({ length: 255 }).notNull(),
});

export const planStep = pgTable("PlanStep", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	planId: uuid().notNull(),
	stepIndex: integer().notNull(),
	stepId: varchar({ length: 100 }).notNull(),
	action: varchar({ length: 500 }).notNull(),
	type: varchar({ length: 50 }).notNull(),
	toolName: varchar({ length: 100 }),
	parameters: json(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	result: json(),
	error: varchar({ length: 1000 }),
	startedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
});

export const executionPlan = pgTable("ExecutionPlan", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	status: varchar({ length: 50 }).default('active').notNull(),
	summary: varchar({ length: 500 }),
	currentStepIndex: integer().default(0).notNull(),
	totalSteps: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});