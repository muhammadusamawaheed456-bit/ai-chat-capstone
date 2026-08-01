import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col">
      <header className="border-b border-slate-800 px-4 py-3 sm:px-6">
        <h1 className="text-sm font-semibold text-slate-200">Assistant</h1>
      </header>
      <ChatInterface />
    </main>
  );
}
