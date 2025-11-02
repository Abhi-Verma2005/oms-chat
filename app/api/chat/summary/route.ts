import { auth } from "@/app/(auth)/auth";
import { updateChatSummary, getChatById } from "@/db/queries";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { chatId, summary }: { chatId: string; summary: string } = await request.json();

    if (!chatId || !summary) {
      return new Response("Missing chatId or summary", { status: 400 });
    }

    // Get existing chat
    const existingChat = await getChatById({ id: chatId });

    if (!existingChat) {
      return new Response("Chat not found", { status: 404 });
    }

    // Verify ownership
    if (existingChat.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // Update summary
    await updateChatSummary({
      id: chatId,
      summary,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating chat summary:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

