/**
 * Shown between "message sent" and "first token arrived." Rendered
 * *inside* the same assistant bubble that will hold the streamed
 * text (see MessageBubble), so there's no swap between a separate
 * "loading" element and the real message — just a fade as the dots
 * give way to text. That's the "handoff, not a swap" the brief calls
 * out: mount both in the same container and let opacity/height
 * transitions do the work instead of conditionally unmounting.
 */
export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Assistant is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
