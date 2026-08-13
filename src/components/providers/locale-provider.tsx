"use client";

import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useTransition } from "react";
import ar from "../../../messages/ar.json";
import de from "../../../messages/de.json";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import fr from "../../../messages/fr.json";
import it from "../../../messages/it.json";
import ptBR from "../../../messages/pt-BR.json";
import ru from "../../../messages/ru.json";
import {
  localeCookieName,
  localeDirection,
  type AppLocale,
} from "@/i18n/config";

type Messages = Record<string, unknown>;

const localeMessages: Record<AppLocale, Messages> = {
  en,
  es,
  "pt-BR": ptBR,
  ar,
  fr,
  ru,
  de,
  it,
};

function mergeMessages(fallback: Messages, localized: Messages): Messages {
  return Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => {
      const localizedValue = localized[key];
      if (
        value && localizedValue &&
        typeof value === "object" && typeof localizedValue === "object" &&
        !Array.isArray(value) && !Array.isArray(localizedValue)
      ) {
        return [key, mergeMessages(value as Messages, localizedValue as Messages)];
      }
      return [key, localizedValue ?? value];
    }),
  );
}

type LocaleController = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleController>({
  locale: "en",
  setLocale: () => undefined,
});

export function useLocaleController() {
  return useContext(LocaleContext);
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: AppLocale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const locale = initialLocale;
  const messages = useMemo(
    () => mergeMessages(en, localeMessages[locale]),
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    if (nextLocale === locale) return;
    document.cookie = `${localeCookieName}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    startTransition(() => router.refresh());
  }, [locale, router, startTransition]);

  const controller = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={controller}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
