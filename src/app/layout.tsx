import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio Control — Caption Admin",
  description: "A private operations console for the AI caption studio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
