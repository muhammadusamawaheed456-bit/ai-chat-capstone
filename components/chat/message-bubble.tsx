import { SafeMarkdown } from "./safe-markdown";
import { ThinkingIndicator } from "./thinking-indicator";

export type ChatRole = "user" | "assistant";

interface MessageBubbleProps {
  role: ChatRole;
  text: string;
  /** True only for the in-flight assistant message before any text has arrived. */
  isPending: boolean;
}

export function MessageBubble({ role, text, isPending }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full animate-fade-in-up ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[70%] ${
          isUser
            ? "bg-indigo-500 text-white"
            : "bg-slate-800 text-slate-100"
        }`}
      >
        {/* Both states live in the same bubble so the transition from
            dots to text is a content swap inside one element, not a
            mount/unmount of two different elements. */}
        {isPending && text.length === 0 ? (
          <ThinkingIndicator />
        ) : isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
        ) : (
          <SafeMarkdown text={text} />
        )}
      </div>
    </div>
  );
}
