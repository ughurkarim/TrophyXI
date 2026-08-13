export const locales = ["en", "es", "pt-BR", "ar", "fr", "ru", "de", "it"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";
export const localeCookieName = "trophy-xi-locale";

export const localeNames: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  "pt-BR": "Português",
  ar: "العربية",
  fr: "Français",
  ru: "Русский",
  de: "Deutsch",
  it: "Italiano",
};

export const localeFlags: Record<AppLocale, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  "pt-BR": "🇧🇷",
  ar: "🇸🇦",
  fr: "🇫🇷",
  ru: "🇷🇺",
  de: "🇩🇪",
  it: "🇮🇹",
};

export const localeShortNames: Record<AppLocale, string> = {
  en: "EN",
  es: "ES",
  "pt-BR": "PT",
  ar: "AR",
  fr: "FR",
  ru: "RU",
  de: "DE",
  it: "IT",
};

export function isAppLocale(value: string | undefined): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function normalizeLocale(value: string | undefined): AppLocale | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "pt" || normalized.startsWith("pt-")) return "pt-BR";
  if (normalized === "ar" || normalized.startsWith("ar-")) return "ar";
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  if (normalized === "fr" || normalized.startsWith("fr-")) return "fr";
  if (normalized === "ru" || normalized.startsWith("ru-")) return "ru";
  if (normalized === "de" || normalized.startsWith("de-")) return "de";
  if (normalized === "it" || normalized.startsWith("it-")) return "it";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return null;
}

export function localeDirection(locale: AppLocale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
