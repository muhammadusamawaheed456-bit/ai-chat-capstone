# Streaming Chat Capstone

The capstone's central AI interaction, built as a streaming interface with
the AI SDK + Claude. Drop this into (or use as) your Next.js App Router
project.

## File map

| File | What it does |
|---|---|
| `lib/ai/config.ts` | Model id, generation params, and system prompt — the **one place** to edit behavior. |
| `app/api/chat/route.ts` | Server route handler. Calls `streamText`, returns a message stream. API key never leaves the server. |
| `components/chat/chat-interface.tsx` | `useChat` wiring, scroll-pin logic, stop handling, localStorage persistence. |
| `components/chat/chat-input.tsx` | Mobile-friendly input + 5-state send/stop button. |
| `components/chat/message-bubble.tsx` | User vs. assistant styling; hosts the thinking→text handoff. |
| `components/chat/thinking-indicator.tsx` | Pre-first-token indicator. |
| `components/chat/safe-markdown.tsx` | Repairs unclosed `**`/`` ` ``` `` mid-stream before rendering. |

## Setup

```bash
npm install
cp .env.example .env.local   # then paste in your real ANTHROPIC_API_KEY
npm run dev
```

Visit `http://localhost:3000/chat`.

## Deploying to get a preview URL

The evaluation asks for a preview URL a reviewer can open directly. Fastest path:

1. Push this project to a GitHub repo.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add `ANTHROPIC_API_KEY` (and optionally `CHAT_MODEL_ID`) under
   Project Settings → Environment Variables — **not** in any file that
   gets committed.
4. Deploy. Vercel gives you a `*.vercel.app` URL — that's the link to submit,
   pointed at `/chat`.

## How this satisfies the eval criteria

- **Streams token by token** — `streamText(...).toUIMessageStreamResponse()`
  on the server; `useChat` applies each text-delta part to `messages` as it
  arrives on the client.
- **Stoppable mid-stream without breaking state** — `stop()` from `useChat`
  aborts the in-flight request; the AI SDK keeps whatever partial text had
  already streamed in place and flips `status` back to `"ready"`, so the
  input re-enables and the next `sendMessage` call works immediately. The
  server route also wires `abortSignal: req.signal` into `streamText` so the
  upstream Anthropic call is actually cancelled, not just ignored client-side.
- **State survives multiple turns** — `useChat` accumulates `messages`
  across sends in one mount; `chat-interface.tsx` additionally mirrors that
  array to `localStorage` so a page refresh mid-conversation restores it.
- **API key server-side only** — only referenced in `lib/ai/config.ts` via
  `@ai-sdk/anthropic`, which reads `process.env.ANTHROPIC_API_KEY` — a
  server-only env var (no `NEXT_PUBLIC_` prefix) that's never sent to the
  client bundle.
- **Usable at phone width** — the input area respects
  `env(safe-area-inset-bottom)`, the textarea auto-grows instead of
  scrolling internally, `font-size: 16px` on inputs prevents iOS auto-zoom,
  and message bubbles cap at `85%` width on narrow viewports.

## Notes on the trickier bits (per the mentor tips)

- **Auto-scroll**: `chat-interface.tsx` tracks `isPinnedToBottom` from the
  scroll container's `onScroll` handler using a distance-from-bottom
  threshold, not a boolean "did they scroll at all." The pin releases the
  moment the user scrolls up and only re-engages when they scroll back to
  the bottom or tap "Jump to latest" — it's never silently re-engaged just
  because new tokens arrived while they were reading up-thread.
- **Thinking indicator handoff**: `message-bubble.tsx` renders the dots and
  the eventual text *inside the same bubble element*, swapping content
  rather than swapping components, so there's no unmount/mount flicker at
  the first-token boundary.
- **Streaming markdown safety**: `safe-markdown.tsx` scans the buffered
  text before each render for an odd count of `` ``` `` / `**` / `_` and
  provisionally closes them, so a half-finished code fence renders as a
  (temporarily) closed block instead of swallowing the rest of the page.
  This is a lightweight regex approach sized for short-to-medium chat
  responses — swap for a proper incremental parser (e.g. `streamdown`) if
  your feature streams long, code-heavy output.

## Adapting for your specific track

`SYSTEM_PROMPT` in `lib/ai/config.ts` has notes for FE1 (qualification
chat), FE2 (audit summary stream), and FE3 (generic AI feature) — swap in
the prompt for whichever this capstone is standing in for; nothing else
needs to change to support a different conversational purpose.

## Version note

Written against AI SDK v5 (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) APIs
as documented in mid-2025/early-2026 docs. The AI SDK ships fast — if
`useChat`'s return shape or `streamText`'s response helper name has moved
on since, check https://ai-sdk.dev/docs/ai-sdk-ui/chatbot against this code
before assuming a bug is yours.
