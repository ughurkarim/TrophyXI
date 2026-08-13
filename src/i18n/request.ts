import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
  normalizeLocale,
  type AppLocale,
} from "./config";

const messageLoaders: Record<AppLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
  "pt-BR": () => import("../../messages/pt-BR.json"),
  ar: () => import("../../messages/ar.json"),
  fr: () => import("../../messages/fr.json"),
  ru: () => import("../../messages/ru.json"),
  de: () => import("../../messages/de.json"),
  it: () => import("../../messages/it.json"),
};

function mergeMessages(
  fallback: Record<string, unknown>,
  localized: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => {
      const localizedValue = localized[key];
      if (
        value &&
        localizedValue &&
        typeof value === "object" &&
        typeof localizedValue === "object" &&
        !Array.isArray(value) &&
        !Array.isArray(localizedValue)
      ) {
        return [
          key,
          mergeMessages(
            value as Record<string, unknown>,
            localizedValue as Record<string, unknown>,
          ),
        ];
      }
      return [key, localizedValue ?? value];
    }),
  );
}

export function localeFromAcceptLanguage(value: string | null): AppLocale {
  if (!value) return defaultLocale;

  const candidates = value
    .split(",")
    .map((entry) => entry.trim().split(";")[0])
    .filter(Boolean);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isAppLocale(savedLocale)
    ? savedLocale
    : localeFromAcceptLanguage((await headers()).get("accept-language"));

  const englishMessages = (await messageLoaders.en()).default;
  const localizedMessages = locale === "en"
    ? englishMessages
    : (await messageLoaders[locale]()).default;

  return {
    locale,
    messages: mergeMessages(englishMessages, localizedMessages),
    onError(error) {
      if (process.env.NODE_ENV !== "production") console.error(error);
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
