import { openai } from "@ai-sdk/openai";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";

import { customMiddleware } from "./custom-middleware";

export const openaiProModel = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: customMiddleware,
});

export const openaiFlashModel = wrapLanguageModel({
  model: openai("gpt-4o-mini"),
  middleware: customMiddleware,
});
