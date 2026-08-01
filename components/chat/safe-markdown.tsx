/**
 * safe-markdown.tsx
 * ------------------------------------------------------------------
 * Streamed markdown arrives token-by-token, so at any given frame the
 * text might contain an unclosed ``` fence or a dangling ** or _. A
 * naive markdown renderer re-parses on every frame and visibly breaks
 * (whole page turns into a code block, bold swallows the rest of the
 * message, etc.).
 *
 * Rather than pull in a full streaming-markdown library, this module
 * takes the "repair, then render" approach: before each render pass,
 * scan the buffered text for constructs that were opened but not yet
 * closed, and provisionally close them. When the real closing token
 * arrives from the stream, the provisional one is simply replaced.
 * This is intentionally lightweight (regex-based) — good enough for
 * short-medium chat responses; swap for `streamdown` or a proper
 * incremental parser if responses get long or code-heavy.
 * ------------------------------------------------------------------
 */

/** Closes an odd number of ``` fences by appending a closing fence. */
function closeUnclosedCodeFences(text: string): string {
  const fenceMatches = text.match(/```/g);
  const count = fenceMatches ? fenceMatches.length : 0;
  if (count % 2 === 1) {
    return text + "\n```";
  }
  return text;
}

/** Closes a trailing unmatched **bold** or *italic* / _italic_ run. */
function closeUnclosedEmphasis(text: string, token: string): string {
  // Ignore markers inside already-balanced code fences to avoid
  // corrupting code samples that legitimately contain * or _.
  const segments = text.split("```");
  let inCode = false;
  let repaired = "";
  for (const segment of segments) {
    if (inCode) {
      repaired += segment;
      inCode = !inCode;
      repaired += segment === segments[segments.length - 1] ? "" : "```";
      continue;
    }
    const occurrences = segment.split(token).length - 1;
    repaired += segment;
    if (occurrences % 2 === 1) {
      repaired += token;
    }
    inCode = !inCode;
    if (segment !== segments[segments.length - 1]) repaired += "```";
  }
  return repaired;
}

export function repairStreamingMarkdown(raw: string): string {
  let text = raw;
  text = closeUnclosedEmphasis(text, "**");
  text = closeUnclosedEmphasis(text, "_");
  text = closeUnclosedCodeFences(text);
  return text;
}

/**
 * Minimal renderer covering what a chat feature actually needs:
 * paragraphs, **bold**, `inline code`, and ```fenced code blocks```.
 * No external markdown dependency required — keeps this file
 * copy-pasteable without a lockfile change.
 */
export function SafeMarkdown({ text }: { text: string }) {
  const repaired = repairStreamingMarkdown(text);
  const blocks = repaired.split(/```/);

  return (
    <div className="space-y-2 text-sm leading-relaxed [overflow-wrap:anywhere]">
      {blocks.map((block, i) => {
        const isCode = i % 2 === 1;
        if (isCode) {
          const [maybeLang, ...rest] = block.split("\n");
          const code = /^[a-zA-Z0-9_-]{0,20}$/.test(maybeLang.trim())
            ? rest.join("\n")
            : block;
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-slate-950/80 p-3 text-xs text-slate-200"
            >
              <code>{code}</code>
            </pre>
          );
        }
        return block
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((para, j) => (
            <p key={`${i}-${j}`}>{renderInline(para)}</p>
          ));
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="rounded bg-slate-800 px-1 py-0.5 text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}
