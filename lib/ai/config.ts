/**
 * lib/ai/config.ts
 * ------------------------------------------------------------------
 * Single source of truth for "how the AI feature behaves."
 *
 * Why this file exists on its own:
 * FE-07 (and any future iteration on this feature) extends the same
 * assistant behavior. Keeping the model id, generation params, and
 * system prompt in one commented module means a later card can
 * change tone/limits/model without touching the route handler or
 * any component code.
 *
 * Rename SYSTEM_PROMPT's content to match whichever capstone track
 * this is standing in for:
 *   - FE1: qualification chat -> ask the visitor structured questions,
 *          keep answers short, end with a clear next step.
 *   - FE2: audit summary stream -> narrate findings as they're produced,
 *          use headings/bullets, don't invent numbers not given to it.
 *   - FE3: generic AI feature -> whatever the product needs the
 *          assistant to do.
 * The prompt below is a safe, generic default; swap it for your track.
 * ------------------------------------------------------------------
 */
import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";

/**
 * TEMPORARY: using Groq's free tier (open-source Llama models) while
 * the Anthropic account has no credit balance. Flip USE_FREE_TIER to
 * false once ANTHROPIC_API_KEY has credits — nothing else in the app
 * needs to change, since route.ts only ever imports `model` from
 * this file.
 */
const USE_FREE_TIER = true;

export const MODEL_ID = USE_FREE_TIER
  ? (process.env.CHAT_MODEL_ID ?? "llama-3.3-70b-versatile")
  : (process.env.CHAT_MODEL_ID ?? "claude-sonnet-4-6");

export const model = USE_FREE_TIER ? groq(MODEL_ID) : anthropic(MODEL_ID);

/**
 * Generation parameters.
 * - maxOutputTokens: hard ceiling per assistant turn. Keeps a single
 *   response from ballooning cost/latency if the model gets verbose.
 * - temperature: lower = more consistent/deterministic answers, which
 *   is usually what you want for a product feature (vs. creative writing).
 */
export const GENERATION_CONFIG = {
  maxOutputTokens: 1024,
  temperature: 0.4,
} as const;

/**
 * The system prompt. Kept short and directive on purpose — a long,
 * meandering system prompt makes the model slower to "settle" into
 * the right register for the first few tokens, which is the exact
 * moment users are staring at the thinking indicator.
 */
export const SYSTEM_PROMPT = `
You are the assistant embedded in this product's chat feature.
Rules:
- Be concise. Prefer short paragraphs and bullet points over long prose.
- If you don't know something the user needs, say so instead of guessing.
- Keep formatting simple: use markdown headings, bold, and lists sparingly
  and only when they genuinely aid scanning.
- Never fabricate specific numbers, dates, or facts about the user's
  business or data that were not provided to you in this conversation.
- Match the user's tone: brief questions get brief answers.
`.trim();

/**
 * How many previous turns to keep in context before trimming.
 * Prevents unbounded token growth on very long conversations.
 * (The route handler applies this before calling streamText.)
 */
export const MAX_HISTORY_MESSAGES = 24;