import { CoreMessage, Message } from "ai";
import { notFound } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat as PreviewChat } from "@/components/custom/chat";
import { getChatById } from "@/db/queries";
import { Chat } from "@/db/schema";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page({ params }: { params: any }) {
  const { id } = params;
  const chatFromDb = await getChatById({ id });

  if (!chatFromDb) {
    notFound();
  }

  // Check if messages are already in UI format (Message) with toolInvocations
  // If so, use them directly; otherwise convert from CoreMessage format
  const dbMessages = chatFromDb.messages as Array<Message | CoreMessage>;
  
  // Check if messages are already in Message format
  // Message format has: id, role, content (string), optional toolInvocations
  // CoreMessage format has: role, content (string or array of parts), no id
  const isAlreadyMessageFormat = dbMessages.length > 0 && 
    dbMessages.every(msg => 
      'id' in msg && 
      typeof msg.content === 'string' &&
      'role' in msg
    );
  
  const messages = isAlreadyMessageFormat
    ? (dbMessages as Array<Message>) // Already in Message format, preserve toolInvocations with results
    : convertToUIMessages(dbMessages as Array<CoreMessage>); // Convert from CoreMessage

  // type casting and converting messages to UI messages
  const chat: Chat = {
    ...chatFromDb,
    messages,
  };

  const session = await auth();

  if (!session || !session.user) {
    return notFound();
  }

  if (session.user.id !== chat.userId) {
    return notFound();
  }

  return <PreviewChat id={chat.id} initialMessages={chat.messages} user={session.user} />;
}
