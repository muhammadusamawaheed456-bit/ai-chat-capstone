import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Streaming Chat Capstone</h1>
      <p className="max-w-md text-sm text-slate-400">
        This is the capstone&apos;s central AI interaction, built as a streaming
        interface with the AI SDK and Claude.
      </p>
      <Link
        href="/chat"
        className="rounded-full bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
      >
        Open the chat →
      </Link>
    </main>
  );
}
