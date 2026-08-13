"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import styles from "./mobile-respin-dialog.module.css";

type MobileRespinKind = "manager" | "formation" | "player";

export function MobileRespinDialog({
  kind,
  remaining,
  onCancel,
  onConfirm,
}: {
  kind: MobileRespinKind;
  remaining?: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations(`dialogs.respin.${kind}`);
  const titleId = `mobile-${kind}-respin-title`;

  return (
    <div
      className={styles.backdrop}
      data-testid={`mobile-${kind}-respin-backdrop`}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <div
        className={styles.dialog}
        data-testid={`mobile-${kind}-respin-dialog`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <span className={styles.eyebrow}>
          {t("eyebrow")}
          {kind === "player" && remaining !== undefined
            ? ` ×${remaining}`
            : ""}
        </span>
        <h2 id={titleId}>
          {t("titleLead")}
          <br />
          {t("titleSubject")}
        </h2>
        <p>{t("description")}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            {t("cancel")}
          </Button>
          <Button onClick={onConfirm}>{t("confirm")}</Button>
        </div>
      </div>
    </div>
  );
}
