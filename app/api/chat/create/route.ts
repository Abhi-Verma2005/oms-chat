import { Message } from "ai";

import { generateChatTitleFromMessages } from "../../../../ai/title";
import { auth } from "../../../../app/(auth)/auth";
import { saveChat } from "../../../../db/queries";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { message }: { message: Message } = await request.json();
    if (!message || !message.content) {
      return new Response("Missing message", { status: 400 });
    }

    const id = crypto.randomUUID();

    // Generate a title from the first message
    let title: string | undefined = undefined;
    try {
      title = await generateChatTitleFromMessages([message]);
    } catch {}

    await saveChat({
      id,
      messages: [message],
      userId: session.user.id || "",
      title,
    });

    return Response.json({ id, title: title || null });
  } catch (error) {
    console.error("Error creating chat:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

