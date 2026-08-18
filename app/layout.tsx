import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serif display face used for demo-site headings (lib/demo/themes.ts) — the
// single biggest lever for making generated demos read as premium/editorial
// rather than generic-template.
//
// V2.3 typography fix: this used to be Fraunces. Root cause of the
// "malformed letters" report was Fraunces itself — it's a variable font
// with SOFT/WONK/opsz axes designed for a deliberately quirky, hand-lettered
// look (curled terminals, an unusual "&", asymmetric counters on "a"/"g").
// At default axis values and rendered at heading sizes (text-5xl/6xl,
// font-weight 400) via next/font/google's variable-font loading, those
// quirks read as broken rather than characterful on ordinary business
// names/short strings like "J and A Roofing" or "&". Source Serif 4 only
// varies on `wght` (no optical-size/wonk axes), so its letterforms are
// stable and conventional at every weight/size while still reading as a
// premium editorial serif. Weight is pinned explicitly (500/600) rather
// than left to each component's arbitrary font-weight utility, so every
// heading renders the same instance instead of the browser synthesizing
// a weight the variable font doesn't have an authored master for.
const sourceSerif = Source_Serif_4({
  variable: "--font-heading-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "UK Local Opportunity Finder",
  description: "Find UK local service businesses with strong reviews but weak digital presence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
