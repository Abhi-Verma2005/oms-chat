import "server-only";

import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { genSaltSync, hashSync } from "bcrypt-ts";

import { chat } from "./schema";
import { external_db } from "@/lib/external-db";
import { users } from "@/lib/drizzle-external/schema";

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
      createdAt: new Date(),
      updatedAt: new Date(),
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
}: {
  id: string;
  messages: any;
  userId: string;
}) {
  try {
    const selectedChats = await db.select().from(chat).where(eq(chat.id, id));

    if (selectedChats.length > 0) {
      return await db
        .update(chat)
        .set({
          messages: JSON.stringify(messages),
        })
        .where(eq(chat.id, id));
    }

    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      messages: JSON.stringify(messages),
      userId,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
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

