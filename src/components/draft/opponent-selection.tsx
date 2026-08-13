"use client";

import Image from "next/image";
import { Check, Crown, Eye, Swords, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { managerGradeLabel } from "@/data/managers";
import { historicalOpponents, worldCupAllStars } from "@/data/opponents";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { flagForCountry } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import type {
  DraftEraId,
  HistoricalLineupPlayer,
  HistoricalWorldCupTeam,
} from "@/types/game";
import styles from "./opponent-selection.module.css";
import { useLocalizedContent } from "@/i18n/content";

export function OpponentSelection({
  eraId,
  onContinue,
  onEditSquad,
}: {
  eraId: DraftEraId;
  onContinue: () => void;
  onEditSquad?: () => void;
}) {
  const t = useTranslations("opponents");
  const localize = useLocalizedContent();
  const [viewingSquad, setViewingSquad] =
    useState<HistoricalWorldCupTeam | null>(null);
  const selectedOpponentId = useGameStore((state) => state.selectedOpponentId);
  const selectOpponent = useGameStore((state) => state.selectOpponent);
  const selected =
    selectedOpponentId === worldCupAllStars.id
      ? worldCupAllStars
      : historicalOpponents.find(
          (opponent) => opponent.id === selectedOpponentId,
        );
  const allStarsManager = worldCupAllStars.allStars!.manager;
  const managerEraFit = calculateManagerEraFit(allStarsManager, eraId).score;

  return (
    <section
      className={`opponent-selection ${styles.selection}`}
      aria-labelledby="opponent-heading"
      data-testid="opponent-selection"
    >
      <div className="opponent-selection__heading">
        <div>
          <span className="eyebrow eyebrow--gold">{t("gauntlet")}</span>
          <h2 id="opponent-heading">{t("title")}</h2>
        </div>
        <strong>{t("championCount", { count: historicalOpponents.length })}</strong>
      </div>

      <section className="opponent-featured" aria-labelledby="featured-heading">
        <div className="opponent-section-heading">
          <div>
            <span className="eyebrow eyebrow--gold">{t("featuredChallenge")}</span>
            <h3 id="featured-heading">{t("allStars")}</h3>
          </div>
        </div>
        <button
          type="button"
          className={`opponent-card opponent-card--featured ${styles.featuredCard} ${
            selectedOpponentId === worldCupAllStars.id
              ? styles.featuredSelected
              : ""
          }`}
          onClick={() => selectOpponent(worldCupAllStars.id)}
          aria-pressed={selectedOpponentId === worldCupAllStars.id}
          aria-label={t("selectAllStarsAria")}
        >
          <div className={styles.featuredBody}>
            <div className={`opponent-card__title ${styles.featuredTitle}`}>
              <span>{t("allStarsUpper")}</span>
              <span className={styles.difficulty}>
                <small>{t("difficulty")}</small>
                <b>{t("mythic")}</b>
              </span>
            </div>
            <p className={styles.subtitle}>
              {localize(worldCupAllStars.allStars?.subtitle)}
            </p>
            <Ratings
              opponent={worldCupAllStars}
              className={styles.featuredRatings}
            />
            <div className={styles.managerProfile}>
              <div className={styles.managerHeading}>
                <span>{t("manager")}</span>
                <strong>
                  {allStarsManager.managerName} ·{" "}
                  {flagForCountry(allStarsManager.countryCode)}{" "}
                  {localize(allStarsManager.countryName)} {allStarsManager.tournamentYear}
                </strong>
              </div>
              <dl
                className={styles.managerMetrics}
                aria-label={t("managerProfileAria", { manager: allStarsManager.managerName })}
                data-has-era-fit={eraId !== "all"}
              >
                {[
                  { label: t("off"), value: allStarsManager.grades.offense },
                  { label: t("def"), value: allStarsManager.grades.defense },
                  { label: t("leadership"), value: allStarsManager.leadership },
                  {
                    label: t("gameManagement"),
                    value: allStarsManager.gameManagement,
                  },
                  ...(eraId === "all"
                    ? []
                    : [{ label: t("eraFit"), value: managerEraFit }]),
                ].map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>
                      <b>{managerGradeLabel(metric.value)}</b>
                      <small>{metric.value}</small>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className={styles.managerTactics}>
                <span>
                  {t("preferredFormations")}{" "}
                  <b>{allStarsManager.preferredFormations.join(" · ")}</b>
                </span>
                <span>
                  {t("tacticalStyle")} <b>{localize(allStarsManager.style)}</b>
                </span>
              </div>
            </div>
          </div>
          <SelectedMark
            selected={selectedOpponentId === worldCupAllStars.id}
            className={styles.featuredSelectionMark}
          />
        </button>
      </section>

      <section
        className="historical-opponents"
        aria-labelledby="historical-opponents-heading"
      >
        <div className="opponent-section-heading">
          <div>
            <span className="eyebrow">{t("champions")}</span>
            <h3 id="historical-opponents-heading">
              {t("championsDescription")}
            </h3>
          </div>
          <b>{t("teamCount", { count: historicalOpponents.length })}</b>
        </div>
        <div className={`opponent-grid ${styles.championGrid}`}>
          {[...historicalOpponents]
            .sort(
              (first, second) =>
                (second.tournamentYear ?? 0) -
                (first.tournamentYear ?? 0),
            )
            .map((opponent) => (
            <OpponentCard
              key={opponent.id}
              opponent={opponent}
              selected={opponent.id === selectedOpponentId}
              onSelect={() => selectOpponent(opponent.id)}
              onViewSquad={() => setViewingSquad(opponent)}
            />
          ))}
        </div>
      </section>

      <div
        className={`opponent-selection__continue ${styles.footer} ${
          onEditSquad ? styles.footerWithEdit : ""
        }`}
        data-testid="opponent-action-bar"
      >
        <div className={styles.footerCopy} aria-live="polite">
          <span className="eyebrow">{t("selectedOpponent")}</span>
          <b data-testid="selected-opponent-name">
            {selected?.kind === "all-stars"
              ? `${t("allStars")} · ${t("mythic")}`
              : selected
                ? `${localize(selected.nationName)} ${selected.tournamentYear}`
                : t("chooseOne")}
          </b>
        </div>
        <div className={styles.footerActions} data-testid="opponent-actions">
          {selected && (
            <Button
              variant="secondary"
              onClick={() => setViewingSquad(selected)}
              data-testid="footer-view-xi"
            >
              <Eye size={15} aria-hidden /> {t("viewXi")}
            </Button>
          )}
          {onEditSquad && (
            <Button variant="secondary" onClick={onEditSquad}>
              {t("editSquad")}
            </Button>
          )}
          <Button
            className={styles.tunnelButton}
            onClick={onContinue}
            disabled={!selected}
            data-testid="enter-tunnel"
          >
            {t("enterTunnel")} <Swords size={16} aria-hidden />
          </Button>
        </div>
      </div>
      {viewingSquad && (
        <OpponentSquadDrawer
          opponent={viewingSquad}
          onClose={() => setViewingSquad(null)}
        />
      )}
    </section>
  );
}

function Ratings({
  opponent,
  className = "",
}: {
  opponent: HistoricalWorldCupTeam;
  className?: string;
}) {
  const t = useTranslations("opponents");
  const localize = useLocalizedContent();
  return (
    <div
      className={`opponent-card__ratings ${className}`}
      aria-label={t("ratingsAria", { country: localize(opponent.nationName) })}
    >
      <span>
        {t("attack")} <b>{opponent.ratings.attack}</b>
      </span>
      <span>
        {t("midfield")} <b>{opponent.ratings.midfield}</b>
      </span>
      <span>
        {t("defense")} <b>{opponent.ratings.defense}</b>
      </span>
      <span>
        {t("overall")} <b>{opponent.ratings.overall}</b>
      </span>
    </div>
  );
}

function SelectedMark({
  selected,
  className,
}: {
  selected: boolean;
  className: string;
}) {
  const t = useTranslations("common");
  return (
    <span
      className={`opponent-selected-mark ${className}`}
      data-visible={selected}
      aria-hidden={!selected}
    >
      <Check size={14} aria-hidden /> {t("selected")}
    </span>
  );
}

function OpponentCard({
  opponent,
  selected,
  onSelect,
  onViewSquad,
}: {
  opponent: HistoricalWorldCupTeam;
  selected: boolean;
  onSelect: () => void;
  onViewSquad: () => void;
}) {
  const t = useTranslations("opponents");
  const localize = useLocalizedContent();
  const presentation = championPresentationFor(opponent);
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(presentation?.image) && !imageFailed;
  return (
    <article
      className={`opponent-card opponent-card--champion ${
        styles.historicalCard
      } ${selected ? "opponent-card--selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={t("selectChampionAria", { country: localize(opponent.nationName), year: opponent.tournamentYear ?? "", difficulty: localize(opponent.difficulty) })}
      data-testid={`champion-card-${opponent.tournamentYear}`}
      data-year={opponent.tournamentYear}
      data-long-name={opponent.nationName.length >= 11 ? "true" : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div
        className={styles.championImage}
        aria-hidden
        data-testid={`champion-art-${opponent.tournamentYear}`}
      >
        {hasImage && presentation?.image ? (
          <Image
            src={presentation.image}
            alt=""
            fill
            sizes="(max-width: 720px) 94vw, (max-width: 1100px) 48vw, 300px"
            className={styles.championPlayer}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span>{t("photoPending")}</span>
        )}
      </div>
      <div className={styles.cardContent}>
        <div className="opponent-card__title">
          <span>
            {opponent.nationCode}{" "}
            <i aria-hidden>{flagForCountry(opponent.nationCode)}</i>
          </span>
          <b>{opponent.tournamentYear}</b>
        </div>
        <span className={styles.championLabel}>
          <Crown size={12} aria-hidden /> {t("worldChampion")}
        </span>
        <h3>{localize(opponent.nationName)}</h3>
        <strong className={styles.playerName}>
          {presentation?.player ?? t("representativePending")}
        </strong>
        <p className={styles.championBlurb}>
          {localize(presentation?.blurb ?? opponent.championFact)}
        </p>
        <dl className={styles.cardTactics}>
          <div><dt>{t("manager")}</dt><dd>{opponent.managerName}</dd></div>
          <div><dt>{t("shape")}</dt><dd>{opponent.formationLabel ?? opponent.formation}</dd></div>
        </dl>
        <Ratings opponent={opponent} />
      </div>
      <SelectedMark
        selected={selected}
        className={styles.cardSelectionMark}
      />
      <button
        type="button"
        className={styles.viewXi}
        onClick={(event) => {
          event.stopPropagation();
          onViewSquad();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-label={t("viewLineupAria", { country: localize(opponent.nationName), year: opponent.tournamentYear ?? "" })}
      >
        {t("viewXi")}
      </button>
    </article>
  );
}

function PlayerList({
  players,
  label,
}: {
  players: HistoricalLineupPlayer[];
  label: string;
}) {
  return (
    <ol className={styles.squadList} aria-label={label}>
      {players.map((player) => (
        <li key={`${player.playerIdentityId}-${player.position}`}>
          <span>{player.position === "LCB" || player.position === "RCB" ? "CB" : player.position}</span>
          <b>{player.name}</b>
          {player.rating !== undefined && <small>{player.rating}</small>}
        </li>
      ))}
    </ol>
  );
}

function OpponentSquadDrawer({
  opponent,
  onClose,
}: {
  opponent: HistoricalWorldCupTeam;
  onClose: () => void;
}) {
  const t = useTranslations("opponents");
  const localize = useLocalizedContent();
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
      className={styles.squadDrawer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="selected-champion-heading"
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <header className={styles.dossierHeader}>
        <div>
          <span className="eyebrow eyebrow--gold">{t("selectedChampion")}</span>
          <h3 id="selected-champion-heading">
            {flagForCountry(opponent.nationCode)} {localize(opponent.nationName)}{" "}
            {opponent.tournamentYear}
          </h3>
        </div>
        <button className="icon-button" onClick={onClose} aria-label={t("closeLineup")} autoFocus>
          <X size={17} aria-hidden />
        </button>
      </header>

      <div className={styles.dossierSummary}>
        <dl>
          <div>
            <dt>{t("manager")}</dt>
            <dd>{opponent.managerName}</dd>
          </div>
          <div>
            <dt>{t("formation")}</dt>
            <dd>{opponent.formationLabel ?? opponent.formation}</dd>
          </div>
        </dl>
        <p>{localize(opponent.tacticalProfile)}</p>
        <Ratings opponent={opponent} className={styles.dossierRatings} />
      </div>

      <div className={styles.squadColumns}>
        <section aria-labelledby="starting-xi-heading">
          <span className="eyebrow" id="starting-xi-heading">
            {t("startingXi")}
          </span>
          <PlayerList
            players={opponent.startingLineup}
            label={t("startingXiAria", { country: localize(opponent.nationName), year: opponent.tournamentYear ?? "" })}
          />
        </section>
        <section aria-labelledby="available-substitutes-heading">
          <span className="eyebrow" id="available-substitutes-heading">
            {t("availableSubstitutes")}
          </span>
          <PlayerList
            players={opponent.substitutes}
            label={t("substitutesAria", { country: localize(opponent.nationName), year: opponent.tournamentYear ?? "" })}
          />
        </section>
      </div>
      </aside>
    </div>
  );
}

const championPresentations: Record<
  number,
  { player: string; image: string; blurb: string }
> = {
  2026: { player: "Lamine Yamal", image: "/assets/opponent/yamalwin1.png", blurb: "Yamal\'s fearless right-wing creativity drove Spain through seven straight wins and to a second world title." },
  2022: { player: "Lionel Messi", image: "/assets/opponent/messiwin1.png", blurb: "Messi led Argentina through an opening shock and lifted the trophy after a final for the ages." },
  2018: { player: "Kylian Mbappé", image: "/assets/opponent/mbappewin1.png", blurb: "Kylian Mbappé became the second teenager to score in a World Cup final as France claimed its second title." },
  2014: { player: "Mario Götze", image: "/assets/opponent/gotzewin2.png", blurb: "Götze\'s extra-time finish sealed Germany\'s fourth title at the end of a relentless campaign." },
  2010: { player: "Andrés Iniesta", image: "/assets/opponent/iniestawin1.png", blurb: "Iniesta\'s extra-time strike completed Spain\'s control-heavy recovery from defeat in their opening match." },
  2006: { player: "Andrea Pirlo", image: "/assets/opponent/pirlowin1.png", blurb: "Pirlo orchestrated Italy\'s unbeaten run and set the tempo for a side that conceded only twice." },
  2002: { player: "Ronaldo Nazário", image: "/assets/opponent/ronaldowin1.png", blurb: "Ronaldo scored eight as Brazil won seven straight matches and secured a fifth star." },
  1998: { player: "Zinedine Zidane", image: "/assets/opponent/zidanewin1.png", blurb: "Zidane\'s two final headers turned France\'s home tournament into a first world title." },
  1994: { player: "Romário", image: "/assets/opponent/romariowin1.png", blurb: "Romário\'s movement and finishing ended Brazil\'s 24-year wait for the trophy." },
  1990: { player: "Lothar Matthäus", image: "/assets/opponent/matthauswin1.png", blurb: "Matthäus drove West Germany\'s structured control on the road to a third title." },
  1986: { player: "Diego Maradona", image: "/assets/opponent/maradonawin1.png", blurb: "Maradona delivered one of football\'s defining individual tournament campaigns." },
  1982: { player: "Paolo Rossi", image: "/assets/opponent/rossiwin1.png", blurb: "Rossi\'s six goals powered Italy\'s knockout surge and earned him the Golden Boot." },
  1978: { player: "Daniel Passarella", image: "/assets/opponent/passarella1.png", blurb: "Passarella captained Argentina\'s intense home triumph and first world championship." },
  1974: { player: "Franz Beckenbauer", image: "/assets/opponent/beckenbauerwin1.png", blurb: "Beckenbauer\'s sweeper authority guided West Germany through a comeback in the final." },
  1970: { player: "Pelé", image: "/assets/opponent/pelewin1.png", blurb: "Pelé completed his third triumph as Brazil won every match with fluid attacking brilliance." },
};

const championPresentationFor = (
  opponent: HistoricalWorldCupTeam
) => {
  if (!opponent.tournamentYear) {
    return undefined;
  }

  return championPresentations[opponent.tournamentYear];
};
