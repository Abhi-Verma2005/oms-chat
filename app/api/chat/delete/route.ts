import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById } from "@/db/queries";

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing chat id" }, { status: 400 });
    }

    // Get existing chat to verify ownership
    const existingChat = await getChatById({ id });

    if (!existingChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Verify ownership
    if (existingChat.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the chat
    await deleteChatById({ id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

