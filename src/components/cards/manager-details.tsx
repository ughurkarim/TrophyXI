"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { managerGradeLabel } from "@/data/managers";
import { historicalOpponents } from "@/data/opponents";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { flagForCountry, flagForTeamName } from "@/lib/utils";
import type { DraftEraId, ManagerTournamentCard } from "@/types/game";
import styles from "./manager-details.module.css";
import { useLocalizedContent } from "@/i18n/content";

export function ManagerDetails({
  manager,
  eraId = "all",
  onClose,
}: {
  manager: ManagerTournamentCard;
  eraId?: DraftEraId;
  onClose: () => void;
}) {
  const t = useTranslations("players.managerDetails");
  const cardT = useTranslations("players.managerCard");
  const localize = useLocalizedContent();
  const eraFit = calculateManagerEraFit(manager, eraId);
  const tournamentRecord = historicalOpponents.find(
    (opponent) =>
      opponent.tournamentYear === manager.tournamentYear &&
      opponent.nationName === manager.teamName,
  );
  const weaknesses = [
    manager.grades.offense < 78
      ? t("weaknesses.attack")
      : null,
    manager.grades.defense < 78
      ? t("weaknesses.defense")
      : null,
    manager.acceptableFormations.length <= 4
      ? t("weaknesses.formations")
      : null,
    eraFit.applicable && eraFit.score < 75
      ? t("weaknesses.era")
      : null,
  ].filter((item): item is string => Boolean(item));
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="player-drawer manager-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <button
          className="icon-button player-drawer__close"
          onClick={onClose}
          aria-label={t("close")}
          autoFocus
        >
          <X size={18} aria-hidden />
        </button>
        <div className="manager-detail-hero">
          <CircularPortrait
            imageId={manager.imageId}
            subjectName={manager.managerName}
            era={manager.era}
            countryCode={manager.countryCode}
            tournamentYear={manager.tournamentYear}
            size="hero"
          />
          <div>
            <span className="eyebrow eyebrow--gold">
              {flagForCountry(manager.countryCode)} {localize(manager.countryName)} ·{" "}
              {flagForTeamName(manager.teamName)} {localize(manager.teamName)}{" "}
              {manager.tournamentYear}
            </span>
            <h2 id="manager-detail-title">{manager.managerName}</h2>
            <p>{localize(manager.tacticalIdentity)}</p>
          </div>
        </div>
        <section>
          <span className="eyebrow">{t("record")}</span>
          <dl
            className={`record-grid manager-detail-grades ${styles.metrics}`}
          >
            <div>
              <dt>{cardT("off")}</dt>
              <dd>
                {managerGradeLabel(manager.grades.offense)}{" "}
                <small>{manager.grades.offense}</small>
              </dd>
            </div>
            <div>
              <dt>{cardT("def")}</dt>
              <dd>
                {managerGradeLabel(manager.grades.defense)}{" "}
                <small>{manager.grades.defense}</small>
              </dd>
            </div>
            <div>
              <dt>{t("leadership")}</dt>
              <dd>
                {managerGradeLabel(manager.leadership)}{" "}
                <small>{manager.leadership}</small>
              </dd>
            </div>
            <div>
              <dt>{t("gameManagement")}</dt>
              <dd>
                {managerGradeLabel(manager.gameManagement)}{" "}
                <small>{manager.gameManagement}</small>
              </dd>
            </div>
            {eraFit.applicable && (
              <div>
                <dt>{t("eraFit")}</dt>
                <dd>
                  {managerGradeLabel(eraFit.score)} <small>{eraFit.score}</small>
                </dd>
              </div>
            )}
          </dl>
        </section>
        <section>
          <span className="eyebrow">{t("tacticalProfile")}</span>
          <p className="data-disclosure">
            {t("preferred")}: {manager.preferredFormations.join(" · ")}
          </p>
          <p className="data-disclosure">
            {t("style")}: {localize(manager.style)} · {localize(manager.teamName)}{" "}
            {manager.tournamentYear}
          </p>
          <p className="data-disclosure">
            {eraFit.applicable
              ? t("eraFitDescription", { score: eraFit.score })
              : t("neutralEra")}
          </p>
          <div className="manager-strength-grid">
            <article>
              <b>{t("strengths")}</b>
              <p>{t("strengthsDescription", { identity: localize(manager.tacticalIdentity), formations: manager.preferredFormations.join(", ") })}</p>
            </article>
            <article>
              <b>{t("weaknessesTitle")}</b>
              <p>
                {weaknesses.length
                  ? weaknesses.join(" ")
                  : t("weaknesses.none")}
              </p>
            </article>
          </div>
        </section>
        {tournamentRecord?.tournamentFinish && (
          <section>
            <span className="eyebrow">{t("tournamentResult")}</span>
            <p className="data-disclosure">
              {localize(manager.teamName)} ·{" "}
              <b className={styles.result}>
                {localize(tournamentRecord.tournamentFinish)}
              </b>
            </p>
          </section>
        )}
        {manager.achievements.length > 0 && (
          <section>
            <span className="eyebrow">{t("accolades")}</span>
            <ul className="achievement-list">
              {manager.achievements.map((achievement) => (
                <li key={achievement.id}>
                  <b>{localize(achievement.label)}</b>
                  <p>{localize(achievement.description)}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
