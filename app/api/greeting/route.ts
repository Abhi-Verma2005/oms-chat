import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { openaiFlashModel } from "../../../ai";

const QuerySchema = z.object({
  bucket: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse({ bucket: searchParams.get("bucket") || undefined });

    const hour = new Date().getHours();
    const timeBucket = parsed.success
      ? parsed.data.bucket
      : hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 17
      ? "afternoon"
      : hour >= 17 && hour < 21
      ? "evening"
      : "night";

    const { object } = await generateObject({
      model: openaiFlashModel,
      schema: z.object({ 
        greeting: z.string(),
        subtitle: z.string()
      }),
      prompt: `You are crafting a compact hero heading for an SEO/backlink chat app. 
Return two fields:
- greeting: a creative, brand-friendly THREE-WORD title (Title Case, no punctuation/emojis) tuned for time bucket ${timeBucket}.
- subtitle: a concise 6-10 word supporting line that complements the title and sets context: discovery, filters, cart, secure checkout.
Keep both relevant to backlinks and productivity.`,
      temperature: 0.7,
    });

    let greeting = object.greeting.trim();
    let subtitle = (object.subtitle || "").trim();

    // Minimal guardrails
    if (greeting.split(/\s+/).length !== 3) {
      greeting =
        timeBucket === "morning"
          ? "Morning Rank Momentum"
          : timeBucket === "afternoon"
          ? "Afternoon Link Lift"
          : timeBucket === "evening"
          ? "Evening Growth Focus"
          : "Night Strategy Flow";
    }
    if (!subtitle || subtitle.length < 6) {
      subtitle = "Plan filters, browse publishers, pay securely";
    }

    return NextResponse.json({ greeting, subtitle });
  } catch (error) {
    return NextResponse.json(
      { greeting: "Backlink Scout Start", subtitle: "Plan filters, browse publishers, pay securely" },
      { status: 200 }
    );
  }
}


