"use client";

import { Button } from "@/components/ui/button";
import styles from "./mobile-respin-dialog.module.css";

type MobileRespinKind = "manager" | "formation" | "player";

const content: Record<
  MobileRespinKind,
  {
    eyebrow: string;
    titleLead: string;
    titleSubject: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
  }
> = {
  manager: {
    eyebrow: "MANAGER RESPIN ×1",
    titleLead: "Replace all three",
    titleSubject: "manager choices?",
    description:
      "Original managers will not return when valid alternatives exist.",
    confirmLabel: "RESPIN MANAGERS",
    cancelLabel: "KEEP MANAGERS",
  },
  formation: {
    eyebrow: "FORMATION RESPIN ×1",
    titleLead: "Replace all four",
    titleSubject: "systems?",
    description:
      "The new offer keeps the same manager, era, and player respins.",
    confirmLabel: "RESPIN SYSTEMS",
    cancelLabel: "KEEP SYSTEMS",
  },
  player: {
    eyebrow: "PLAYER RESPIN",
    titleLead: "Replace these five",
    titleSubject: "player choices?",
    description:
      "All five choices will be replaced. The current round and your other respins remain unchanged.",
    confirmLabel: "RESPIN PLAYERS",
    cancelLabel: "KEEP PLAYERS",
  },
};

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
  const copy = content[kind];
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
          {copy.eyebrow}
          {kind === "player" && remaining !== undefined
            ? ` ×${remaining}`
            : ""}
        </span>
        <h2 id={titleId}>
          {copy.titleLead}
          <br />
          {copy.titleSubject}
        </h2>
        <p>{copy.description}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            {copy.cancelLabel}
          </Button>
          <Button onClick={onConfirm}>{copy.confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
