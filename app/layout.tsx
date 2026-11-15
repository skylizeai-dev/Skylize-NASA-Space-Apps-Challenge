import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { APP_NAME } from "@/lib/format";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME}: microgravity fire evidence for any habitat atmosphere`,
  description:
    "Pick a spacecraft or habitat atmosphere and see NASA's microgravity combustion findings ranked by how closely they were tested to it, every one linked to its source.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
