"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  isAppLocale,
  localeDirection,
  localeFlags,
  localeNames,
  locales,
  type AppLocale,
} from "@/i18n/config";
import { useLocaleController } from "@/components/providers/locale-provider";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const currentLocale = useLocale();
  const { setLocale } = useLocaleController();
  const t = useTranslations("navigation");
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const locale: AppLocale = isAppLocale(currentLocale) ? currentLocale : "en";

  useEffect(() => {
    if (!open) return;
    const placeMenu = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 176;
      const menuHeight = 360;
      const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
      const top = rect.bottom + 8 + menuHeight > window.innerHeight
        ? Math.max(8, rect.top - menuHeight - 8)
        : rect.bottom + 8;
      setPosition({ top, left });
    };
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function selectLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      setOpen(false);
      return;
    }

    setLocale(nextLocale);
    setOpen(false);
  }

  return (
    <div className="language-selector" data-open={open || undefined} data-compact={compact || undefined}>
      <button
        ref={triggerRef}
        type="button"
        className="language-selector__trigger"
        aria-label={t("selectLanguage")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="language-selector__flag" aria-hidden>{localeFlags[locale]}</span>
      </button>
      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          className="language-selector__menu"
          style={{ top: position.top, left: position.left }}
          role="listbox"
          aria-label={t("language")}
        >
          {locales.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option === locale}
              key={option}
              lang={option}
              dir={localeDirection(option)}
              onClick={() => selectLocale(option)}
            >
              <span>{localeNames[option]}</span>
              {option === locale ? <Check size={15} aria-hidden /> : null}
            </button>
          ))}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
