import { auth } from "@/app/(auth)/auth";
import { saveChat } from "@/db/queries";
import { generateUUID } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { title }: { title?: string } = await request.json();

    const chatId = generateUUID();

    // Create new chat
    await saveChat({
      id: chatId,
      messages: [],
      userId: session.user.id,
    });

    // Update title if provided
    if (title) {
      // Note: We'll need to add an updateChatTitle function or update saveChat to accept title
      // For now, we'll handle this in the next update
    }

    return Response.json({ chatId, success: true });
  } catch (error) {
    console.error("Error creating chat:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

