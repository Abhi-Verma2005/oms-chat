import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";
import { getUser, getChatsByUserId } from "@/db/queries";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get basic user data from database
    const users = await getUser(session.user.email || "");
    const user = users[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's chat history
    const userChats = await getChatsByUserId({ id: user.id });
    const totalChats = userChats.length;
    const lastActive = userChats.length > 0 
      ? userChats[0].createdAt.toISOString() 
      : new Date().toISOString();

    // For now, return basic user info. In the future, this could be extended
    // to include preferences, chat history, etc. from additional tables
    const userInfo = {
      id: user.id,
      email: user.email,
      name: session.user.name || null,
      preferences: {
        // These could be stored in a separate user_preferences table
        industry: null,
        companySize: null,
        role: null,
        interests: [],
      },
      chatHistory: {
        totalChats,
        lastActive,
      },
    };

    return NextResponse.json(userInfo);
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
