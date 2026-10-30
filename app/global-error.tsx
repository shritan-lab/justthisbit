"use client";

import { Bricolage_Grotesque } from "next/font/google";
import { ERROR_TITLE, ErrorView } from "@/components/error-view";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

// Replaces the root layout when the layout itself throws, so it brings its own <html>, styles and font.
export default function GlobalError({ error }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" className={`${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <title>{`${ERROR_TITLE} · ${SITE_NAME}`}</title>
        <ErrorView error={error} />
      </body>
    </html>
  );
}
