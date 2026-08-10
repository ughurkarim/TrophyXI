import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "@fontsource-variable/sora/wght.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import { StoreHydrator } from "@/components/providers/store-hydrator";
import "./globals.css";
import "./mobile.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fontVariables = {
  "--font-display": '"Sora Variable"',
  "--font-body": '"Inter Variable"',
  "--font-mono": '"JetBrains Mono Variable"',
} as CSSProperties;

export const metadata: Metadata = {
  title: {
    default: "Trophy XI — Build the XI. Beat history.",
    template: "%s — Trophy XI",
  },
  description:
    "Draft legendary tournament performances and challenge the greatest World Cup champions in history.",
  metadataBase: new URL("https://trophyxi.com"),
  openGraph: {
    title: "Trophy XI",
    description:
      "Draft fourteen tournament players. Choose a historical World Cup opponent. Rewrite history.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trophy XI",
    description: "Build the XI. Beat history.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050706",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      style={fontVariables}
      data-scroll-behavior="smooth"
    >
      <body>
        <StoreHydrator />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}