/**
 * app/api/chat/route.ts
 * ------------------------------------------------------------------
 * The only place this app talks to Claude. Runs server-side only, so
 * ANTHROPIC_API_KEY never reaches the browser bundle or a network
 * tab. The client only ever sees this route's streamed response.
 * ------------------------------------------------------------------
 */
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import {
  model,
  GENERATION_CONFIG,
  SYSTEM_PROMPT,
  MAX_HISTORY_MESSAGES,
} from "@/lib/ai/config";

// Streams over a serverless function's default timeout on some hosts;
// this opts into the Edge/Node streaming runtime with a longer budget.
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Trim history server-side. The client keeps the full transcript for
  // display; we only cap what actually gets sent to the model.
  const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const modelMessages = await convertToModelMessages(trimmedMessages);

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    ...GENERATION_CONFIG,
    // If the client aborts (stop button), propagate that abort down to
    // the underlying Anthropic request instead of letting it run to
    // completion in the background.
    abortSignal: req.signal,
  });

  // toUIMessageStreamResponse() emits the typed message-part stream
  // (text-delta, start/finish, etc.) that useChat on the client expects.
  return result.toUIMessageStreamResponse({
    onError: (error) => {
      // Never leak internal error detail (stack traces, provider
      // messages) to the client — return a stable, generic string.
      console.error("[/api/chat] streamText error:", error);
      return "Something went wrong generating a response. Please try again.";
    },
  });
}