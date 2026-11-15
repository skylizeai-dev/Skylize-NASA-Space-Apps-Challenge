import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlameSight — NASA Space Apps 2026",
  description:
    "Ranked, cited fire-safety evidence from NASA's microgravity combustion data, for any spacecraft or habitat atmosphere.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
