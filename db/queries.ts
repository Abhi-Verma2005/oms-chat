import "server-only";

import { genSaltSync, hashSync } from "bcrypt-ts";
import { desc, eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { chat, executionPlan, planStep } from "./schema";
import { users } from "../lib/drizzle-external/schema";
import { external_db } from "../lib/external-db";

// Native database connection
let client = postgres(`${process.env.POSTGRES_URL!}?sslmode=require`);
let db = drizzle(client);

export async function getUser(email: string) {
  try {
    return await external_db.select().from(users).where(eq(users.email, email));
  } catch (error) {
    console.error("Failed to get user from external database");
    throw error;
  }
}

export async function getUserById(id: string) {
  try {
    const [user] = await external_db.select().from(users).where(eq(users.id, id));
    return user;
  } catch (error) {
    console.error("Failed to get user by ID from external database");
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  try {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    
    // Generate a UUID for the user ID (matching the external database schema)
    const userId = crypto.randomUUID();
    
    return await external_db.insert(users).values({
      id: userId,
      email,
      password: hash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to create user in external database");
    throw error;
  }
}

export async function saveChat({
  id,
  messages,
  userId,
  title,
  summary,
}: {
  id: string;
  messages: any;
  userId: string;
  title?: string;
  summary?: string;
}) {
  try {
    const selectedChats = await db.select().from(chat).where(eq(chat.id, id));

    const updateData: any = {
      messages: JSON.stringify(messages),
      updatedAt: new Date(),
    };
    
    if (title !== undefined) {
      updateData.title = title;
    }
    
    if (summary !== undefined) {
      updateData.summary = summary;
    }

    if (selectedChats.length > 0) {
      return await db
        .update(chat)
        .set(updateData)
        .where(eq(chat.id, id));
    }

    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: JSON.stringify(messages),
      userId,
      title: title || null,
      summary: summary || null,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function updateChatSummary({
  id,
  summary,
}: {
  id: string;
  summary: string;
}) {
  try {
    return await db
      .update(chat)
      .set({
        summary,
        updatedAt: new Date(),
      })
      .where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to update chat summary");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

// Plan management functions
export async function createExecutionPlan(data: {
  chatId: string;
  summary: string;
  steps: Array<{ description: string; toolName: string; stepIndex: number }>;
}) {
  try {
    return await db.transaction(async (tx) => {
      // Deactivate any existing active plan
      await tx.update(executionPlan)
        .set({ status: 'cancelled' })
        .where(and(
          eq(executionPlan.chatId, data.chatId),
          eq(executionPlan.status, 'active')
        ));

      // Create new plan
      const [plan] = await tx.insert(executionPlan)
        .values({
          chatId: data.chatId,
          summary: data.summary,
          totalSteps: data.steps.length,
          currentStepIndex: 0,
          status: 'active'
        })
        .returning();

      // Create steps
      const steps = await tx.insert(planStep)
        .values(data.steps.map(step => ({
          planId: plan.id,
          ...step
        })))
        .returning();

      return { ...plan, steps };
    });
  } catch (error) {
    console.error("Failed to create execution plan:", error);
    throw error;
  }
}

export async function getActivePlan(chatId: string) {
  try {
    const plans = await db.select()
      .from(executionPlan)
      .leftJoin(planStep, eq(planStep.planId, executionPlan.id))
      .where(and(
        eq(executionPlan.chatId, chatId),
        eq(executionPlan.status, 'active')
      ))
      .orderBy(planStep.stepIndex);

    if (!plans || plans.length === 0) return null;

    const plan = plans[0].ExecutionPlan;
    const steps = plans.map(p => p.PlanStep).filter(Boolean);

    return { ...plan, steps };
  } catch (error) {
    console.error("Failed to get active plan");
    throw error;
  }
}

export async function getPlanById(planId: string) {
  try {
    const plans = await db.select()
      .from(executionPlan)
      .leftJoin(planStep, eq(planStep.planId, executionPlan.id))
      .where(eq(executionPlan.id, planId))
      .orderBy(planStep.stepIndex);

    if (!plans || plans.length === 0) return null;

    const plan = plans[0].ExecutionPlan;
    const steps = plans.map(p => p.PlanStep).filter(Boolean);

    return { ...plan, steps };
  } catch (error) {
    console.error("Failed to get plan by ID");
    throw error;
  }
}

export async function updatePlanProgress(planId: string, stepIndex: number, stepResult: any) {
  try {
    return await db.transaction(async (tx) => {
      // Update step status
      await tx.update(planStep)
        .set({
          status: 'completed',
          result: stepResult,
          completedAt: new Date()
        })
        .where(and(
          eq(planStep.planId, planId),
          eq(planStep.stepIndex, stepIndex)
        ));

      // Update plan current step
      await tx.update(executionPlan)
        .set({
          currentStepIndex: stepIndex + 1,
          updatedAt: new Date()
        })
        .where(eq(executionPlan.id, planId));

      // If all steps complete, mark plan as completed
      const plan = await tx.select().from(executionPlan).where(eq(executionPlan.id, planId)).limit(1);
      if (plan[0] && plan[0].currentStepIndex >= plan[0].totalSteps) {
        await tx.update(executionPlan)
          .set({ status: 'completed' })
          .where(eq(executionPlan.id, planId));
      }
    });
  } catch (error) {
    console.error("Failed to update plan progress");
    throw error;
  }
}

