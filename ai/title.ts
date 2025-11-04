import "server-only";

import { CoreMessage, Message, generateText } from "ai";

import { openaiFlashModel } from "./index";

// Generate a concise chat title from the first few messages using a fast model
export async function generateChatTitleFromMessages(
  messages: Array<Message | CoreMessage>,
): Promise<string> {
  try {
    // Take up to first 4 textual messages for context
    const textSnippets = messages
      .slice(0, 4)
      .map((m: any) => {
        if (typeof m.content === "string") return m.content;
        if (Array.isArray(m.content)) {
          return m.content
            .filter((c: any) => c?.type === "text")
            .map((c: any) => c.text)
            .join(" ");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");

    const system =
      "You are an assistant that writes very short, descriptive chat titles based on the first few messages.";
    const userPrompt = `Create a 3-6 word, sentence-case title summarizing this chat.\n` +
      `- No punctuation, quotes, emojis, or trailing periods\n` +
      `- Avoid generic words like conversation, chat, discussion\n` +
      `Messages:\n${textSnippets}`;

    const { text } = await generateText({
      model: openaiFlashModel,
      system,
      prompt: userPrompt,
    });

    const sanitized = (text || "Untitled").trim()
      .replace(/["'`]/g, "")
      .replace(/[.?!\-–—]+$/g, "")
      .slice(0, 80);

    return sanitized.length > 0 ? sanitized : "Untitled";
  } catch {
    return "Untitled";
  }
}



