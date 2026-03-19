import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pikachu Volleyball",
  description: "Multiplayer Pikachu Volleyball — 1997 Original Recreation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-black antialiased">{children}</body>
    </html>
  );
}
