"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useCallback } from "react";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";

const STORAGE_KEY = "streaming-chat:transcript";
// How close to the bottom (px) counts as "still at the bottom" —
// generous enough that a slightly-off-pixel scroll during a fast
// render doesn't spuriously unpin the view.
const BOTTOM_THRESHOLD_PX = 80;

export function ChatInterface() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [hasNewBelowFold, setHasNewBelowFold] = useState(false);

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    // Multi-turn state: useChat already accumulates `messages` across
    // sends within this mount. We additionally rehydrate/persist to
    // localStorage below so a refresh mid-conversation isn't data loss.
  });

  const isStreaming = status === "submitted" || status === "streaming";

  // --- Persistence (stretch goal): restore on mount, save on change ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // Corrupt or unavailable storage — start fresh rather than crash.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch {
      // Storage might be full or blocked (private browsing) — non-fatal.
    }
  }, [messages]);

  // --- Scroll-pin logic ---
  // The pin releases the instant the user scrolls away from the
  // bottom, and re-engages only when they explicitly return to the
  // bottom (scroll or "jump to latest" click) — never automatically
  // re-engaged just because new tokens arrived.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < BOTTOM_THRESHOLD_PX;
    setIsPinnedToBottom(atBottom);
    if (atBottom) setHasNewBelowFold(false);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setIsPinnedToBottom(true);
    setHasNewBelowFold(false);
  }, []);

  // Runs on every render where message content changes (streaming
  // deltas included) — but only actually moves the scrollbar while
  // the user is already pinned to the bottom.
  useEffect(() => {
    if (isPinnedToBottom) {
      scrollToBottom("auto");
    } else if (messages.length > 0) {
      setHasNewBelowFold(true);
    }
  }, [messages, isPinnedToBottom, scrollToBottom]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setIsPinnedToBottom(true); // sending always snaps back to bottom
    sendMessage({ text });
  };

  // Stop is a state problem, not a UI problem: `stop()` aborts the
  // fetch/stream but the AI SDK deliberately keeps whatever partial
  // text already streamed into `messages` in place, and flips status
  // back to "ready" so the input re-enables and the next send works
  // immediately — no manual cleanup needed here.
  const handleStop = () => stop();

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-6"
      >
        {messages.length === 0 && (
          <p className="mx-auto max-w-sm pt-12 text-center text-sm text-slate-500">
            Say hello to start the conversation.
          </p>
        )}

        {messages.map((message, i) => {
          const text = message.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("");

          const isLastAssistant =
            message.role === "assistant" && i === messages.length - 1;

          return (
            <MessageBubble
              key={message.id}
              role={message.role === "user" ? "user" : "assistant"}
              text={text}
              isPending={isLastAssistant && isStreaming}
            />
          );
        })}

        {error && (
          <p className="mx-auto max-w-sm rounded-lg bg-rose-950/60 px-3 py-2 text-center text-xs text-rose-300">
            {error.message || "Something went wrong. Please try again."}
          </p>
        )}
      </div>

      {/* Jump-to-latest affordance: only visible once the user has
          scrolled away from the bottom AND new content has arrived
          below the fold — not shown just because they scrolled up to
          re-read something with no new activity. */}
      {hasNewBelowFold && !isPinnedToBottom && (
        <div className="flex justify-center">
          <button
            onClick={() => scrollToBottom()}
            className="mb-2 -mt-2 rounded-full bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-200 shadow-lg transition hover:bg-slate-700"
          >
            ↓ Jump to latest
          </button>
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
