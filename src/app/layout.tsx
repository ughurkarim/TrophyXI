import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { StoreHydrator } from "@/components/providers/store-hydrator";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const sora = localFont({
  src: "../../node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "100 800",
});

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "100 900",
});

const jetbrains = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "100 800",
});

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
      "Draft fourteen tournament performances. Choose a historical World Cup opponent. Rewrite history.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050706",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${inter.variable} ${jetbrains.variable}`}
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
