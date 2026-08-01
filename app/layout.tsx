import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streaming Chat Capstone",
  description: "A streaming AI chat interface built with the AI SDK and Claude.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
