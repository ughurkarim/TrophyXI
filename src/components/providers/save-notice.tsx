"use client";

import { X } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { useTranslations } from "next-intl";
import { useLocalizedContent } from "@/i18n/content";

export function SaveNotice() {
  const t = useTranslations("common");
  const localize = useLocalizedContent();
  const notice = useGameStore((state) => state.saveNotice);
  const dismiss = useGameStore((state) => state.dismissNotice);
  if (!notice) return null;
  return (
    <div className="save-notice" role="status" aria-live="polite">
      <p>{localize(notice)}</p>
      <button onClick={dismiss} aria-label={t("dismissNotice")}>
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
