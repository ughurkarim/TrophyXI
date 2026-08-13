import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import "@fontsource-variable/sora/wght.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import { StoreHydrator } from "@/components/providers/store-hydrator";
import "./globals.css";
import "./mobile.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { localeDirection, type AppLocale } from "@/i18n/config";
import { LocaleProvider } from "@/components/providers/locale-provider";

const fontVariables = {
  "--font-display": '"Sora Variable"',
  "--font-body": '"Inter Variable"',
  "--font-mono": '"JetBrains Mono Variable"',
} as CSSProperties;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: {
      default: t("defaultTitle"),
      template: "%s — Trophy XI",
    },
    description: t("description"),
    metadataBase: new URL("https://trophyxi.com"),
    openGraph: {
      title: "Trophy XI",
      description: t("openGraphDescription"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Trophy XI",
      description: t("twitterDescription"),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050706",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await getLocale()) as AppLocale;
  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      style={fontVariables}
      data-scroll-behavior="smooth"
    >
      <body>
        <LocaleProvider initialLocale={locale}>
          <StoreHydrator />
          {children}
          <Analytics />
          <SpeedInsights />
        </LocaleProvider>
      </body>
    </html>
  );
}
