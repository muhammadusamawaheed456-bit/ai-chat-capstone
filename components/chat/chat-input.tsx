"use client";

import { useRef, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  /** true while a response is streaming — swaps the button into "stop" mode */
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isStreaming) return; // button is in "stop" mode; ignore accidental submits
    if (!value.trim() || disabled) return;
    onSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline — standard chat-input
    // convention, and avoids the mobile soft-keyboard "return" key
    // accidentally submitting when the user just wants a line break.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  // Five visual states live entirely in Tailwind class logic below:
  // idle (can send) / disabled (empty input) / streaming (stop) /
  // hover + active are handled by Tailwind's :hover/:active pseudo
  // classes so no extra JS state is needed for those two.
  const canSend = !isStreaming && value.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Message the assistant…"
        rows={1}
        disabled={disabled}
        className="max-h-40 flex-1 resize-none rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      />
      <button
        type={isStreaming ? "button" : "submit"}
        onClick={isStreaming ? onStop : undefined}
        disabled={!isStreaming && !canSend}
        aria-label={isStreaming ? "Stop generating" : "Send message"}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition
          ${
            isStreaming
              ? "bg-rose-500 hover:bg-rose-400 active:scale-95"
              : canSend
                ? "bg-indigo-500 hover:bg-indigo-400 active:scale-95"
                : "cursor-not-allowed bg-slate-700 text-slate-500"
          }`}
      >
        {isStreaming ? <StopIcon /> : <SendIcon />}
      </button>
    </form>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12L20 4L14 20L11 13L4 12Z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
    </svg>
  );
}
