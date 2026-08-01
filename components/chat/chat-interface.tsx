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
  <div className="flex h-[100dvh] flex-col bg-gradient-to-b from-[#101828] via-[#0B1220] to-[#060B1A]">

    {/* Header */}
    <header className="sticky top-0 z-20 border-b border-white/10 bg-gradient-to-b from-[#101828] via-[#0B1220] to-[#060B1A]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
            🤖
          </div>

          <div>
            <h1 className="font-semibold text-white">
              AI Assistant
            </h1>

            <p className="text-xs text-slate-400">
              Streaming Chat
            </p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
          ● Online
        </span>

      </div>
    </header>

    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col space-y-8 px-4 pt-10 pb-8">
        {messages.length === 0 && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-indigo-500/20 p-5 text-3xl">
              ✨
            </div>

            <h2 className="text-2xl font-semibold text-white">
              Streaming Chat
            </h2>

            <p className="mt-2 max-w-md text-slate-400">
              Powered by AI SDK with real-time streaming responses.
              <br />
              Start a conversation below.
            </p>
          </div>
        )}

        {messages.map((message, i) => {
          const text = message.parts
            .filter(
              (p): p is { type: "text"; text: string } => p.type === "text"
            )
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
    </div>

    {hasNewBelowFold && !isPinnedToBottom && (
      <button
        onClick={() => scrollToBottom()}
        className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900/90 px-5 py-2 text-sm text-white shadow-2xl backdrop-blur transition hover:scale-105"
      >
        ↓ Jump to latest
      </button>
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
