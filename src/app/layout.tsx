// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "SiteWatch: uptime monitoring for small teams",
    template: "%s · SiteWatch",
  },
  description:
    "SiteWatch checks your websites and APIs every few minutes, opens incidents when they fail, pings your team in Slack or Discord and gives you a public status page.",
  openGraph: {
    title: "SiteWatch",
    description: "Uptime monitoring, incidents and status pages for small teams.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
