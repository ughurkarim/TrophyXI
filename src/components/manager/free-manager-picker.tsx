"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDot,
  Crown,
  Scale,
  Search,
  Shield,
  Target,
  Waves,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { flagForCountry } from "@/lib/utils";
import type { DraftEraId, ManagerTournamentCard } from "@/types/game";
import styles from "./free-manager-picker.module.css";
import { useLocalizedContent } from "@/i18n/content";

type SortMode = "quality" | "era-fit" | "name" | "year";

type SelectOption = {
  value: string;
  label: string;
};

function CustomSelect({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.customSelect} ref={rootRef}>
      <button
        type="button"
        className={`${styles.customSelectTrigger}${open ? ` ${styles.customSelectOpen}` : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open && (
        <div className={styles.customSelectMenu} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.customSelectOption}${isSelected ? ` ${styles.customSelectOptionSelected}` : ""}`}
                key={option.value || `all-${option.label}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={13} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


export const managerQualityScore = (manager: ManagerTournamentCard) =>
  Math.round(
    (manager.grades.offense +
      manager.grades.defense +
      manager.leadership +
      manager.gameManagement) /
      4,
  );

const qualityOrder = (
  first: ManagerTournamentCard,
  second: ManagerTournamentCard,
) =>
  managerQualityScore(second) - managerQualityScore(first) ||
  second.leadership - first.leadership ||
  second.gameManagement - first.gameManagement ||
  first.managerName.localeCompare(second.managerName);

function TacticalIcon({ style, size = 13 }: { style: string; size?: number }) {
  const normalized = style.toLocaleLowerCase();

  if (normalized === "pressing") return <Zap size={size} aria-hidden />;
  if (normalized === "counter") return <ArrowRight size={size} aria-hidden />;
  if (normalized === "defensive") return <Shield size={size} aria-hidden />;
  if (normalized === "direct") return <Target size={size} aria-hidden />;
  if (normalized === "fluid") return <Waves size={size} aria-hidden />;
  if (normalized === "possession") return <CircleDot size={size} aria-hidden />;
  return <Scale size={size} aria-hidden />;
}

export function FreeManagerPicker({
  managers,
  eraId,
  selectedManagerId,
  managerLocked = false,
  onSelect,
  onInspect,
  onContinue,
}: {
  managers: ManagerTournamentCard[];
  eraId: DraftEraId;
  selectedManagerId: string | null;
  managerLocked?: boolean;
  onSelect: (managerId: string) => void;
  onInspect: (managerId: string, returnFocus: HTMLElement) => void;
  onContinue: () => void;
}) {
  void managerLocked;

  const t = useTranslations("freeSelection.managerPicker");
  const managerT = useTranslations("players.managerCard");
  const eraT = useTranslations("gameSetup.era.options");
  const localize = useLocalizedContent();

  const [query, setQuery] = useState("");
  const [nation, setNation] = useState("");
  const [managerEra, setManagerEra] = useState("");
  const [style, setStyle] = useState("");
  const [preferredFormation, setPreferredFormation] = useState("");
  const [sort, setSort] = useState<SortMode>("quality");

  const era = getDraftEra(eraId);
  const isNeutralEra = eraId === "all";
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const permanentRanking = useMemo(
    () => [...managers].sort(qualityOrder),
    [managers],
  );

  const ranks = useMemo(
    () =>
      new Map(
        permanentRanking.map((manager, index) => [manager.id, index + 1]),
      ),
    [permanentRanking],
  );

  const visibleManagers = useMemo(() => {
    const filtered = managers.filter(
      (manager) =>
        (!normalizedQuery ||
          [
            manager.managerName,
            manager.teamName,
            manager.countryName,
            manager.tournamentYear,
            manager.style,
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalizedQuery)) &&
        (!nation || manager.countryCode === nation) &&
        (!managerEra || manager.era === managerEra) &&
        (!style || manager.style === style) &&
        (!preferredFormation ||
          manager.preferredFormations.includes(preferredFormation as never)),
    );

    return filtered.sort((first, second) => {
      if (sort === "era-fit" && !isNeutralEra) {
        return (
          calculateManagerEraFit(second, eraId).score -
            calculateManagerEraFit(first, eraId).score ||
          qualityOrder(first, second)
        );
      }
      if (sort === "name") {
        return (
          first.managerName.localeCompare(second.managerName) ||
          second.tournamentYear - first.tournamentYear
        );
      }
      if (sort === "year") {
        return (
          second.tournamentYear - first.tournamentYear ||
          qualityOrder(first, second)
        );
      }
      return qualityOrder(first, second);
    });
  }, [
    eraId,
    isNeutralEra,
    managerEra,
    managers,
    nation,
    normalizedQuery,
    preferredFormation,
    sort,
    style,
  ]);

  const selectedManager = selectedManagerId
    ? managers.find((manager) => manager.id === selectedManagerId)
    : undefined;

  const nationOptions = [
    ...new Map(
      managers.map((manager) => [manager.countryCode, manager.countryName]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  const formationOptions = [
    ...new Set(managers.flatMap((manager) => manager.preferredFormations)),
  ].sort();

  return (
    <section
      className={styles.picker}
      aria-labelledby="free-manager-title"
      data-testid="free-manager-picker"
    >
      <div className={styles.intro}>
        <div>
          <p className="eyebrow eyebrow--gold">{t("eyebrow")}</p>
          <h1 id="free-manager-title">{t("title")}</h1>
        </div>
        <p>
          {t("description")}
        </p>
      </div>

      <div className={styles.controls} aria-label={t("controlsAria")}>
        <label className={styles.search}>
          <Search size={17} aria-hidden />
          <span className="sr-only">{t("search")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        </label>

        <CustomSelect
          ariaLabel={t("nation")}
          value={nation}
          onChange={setNation}
          options={[
            { value: "", label: t("allNations") },
            ...nationOptions.map(([code, name]) => ({ value: code, label: localize(name) })),
          ]}
        />

        <CustomSelect
          ariaLabel={t("managerEra")}
          value={managerEra}
          onChange={setManagerEra}
          options={[
            { value: "", label: t("allEras") },
            ...["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"].map((value) => ({ value, label: value })),
          ]}
        />

        <CustomSelect
          ariaLabel={t("tacticalStyle")}
          value={style}
          onChange={setStyle}
          options={[
            { value: "", label: t("allStyles") },
            ...[...new Set(managers.map((manager) => manager.style))]
              .sort()
              .map((value) => ({ value, label: localize(value) })),
          ]}
        />

        <CustomSelect
          ariaLabel={t("preferredFormation")}
          value={preferredFormation}
          onChange={setPreferredFormation}
          options={[
            { value: "", label: t("allFormations") },
            ...formationOptions.map((value) => ({
              value,
              label: value.replaceAll("-", "–"),
            })),
          ]}
        />

        <CustomSelect
          ariaLabel={t("sortManagers")}
          value={sort}
          onChange={(value) => setSort(value as SortMode)}
          options={[
            { value: "quality", label: t("sort.bestOverall") },
            ...(!isNeutralEra ? [{ value: "era-fit", label: t("sort.eraFit") }] : []),
            { value: "name", label: t("sort.name") },
            { value: "year", label: t("sort.year") },
          ]}
        />
      </div>

      <aside
        className={`${styles.preview}${
          selectedManager ? "" : ` ${styles.previewEmpty}`
        }`}
        aria-label={
          selectedManager
            ? t("selectedPreviewAriaNamed", { manager: selectedManager.managerName })
            : t("selectedPreviewAria")
        }
      >
        <div className={styles.previewPortraitStage}>
          {selectedManager ? (
            <>
              <span className={styles.previewCrown} aria-hidden>
                <Crown size={16} />
              </span>
              <CircularPortrait
                imageId={selectedManager.imageId}
                subjectName={selectedManager.managerName}
                era={selectedManager.era}
                countryCode={selectedManager.countryCode}
                tournamentYear={selectedManager.tournamentYear}
                size="compact"
              />
            </>
          ) : (
            <>
              <span className={styles.previewCrown} aria-hidden>
                <Crown size={16} />
              </span>
              <div className={styles.previewPlaceholderPortrait} aria-hidden>
                <span />
              </div>
            </>
          )}
        </div>

        {selectedManager ? (
          <>
            <div className={styles.previewIdentity}>
              <span>{t("selectedManager")}</span>
              <strong>{selectedManager.managerName}</strong>
              <small>
                {flagForCountry(selectedManager.countryCode)}{" "}
                {localize(selectedManager.countryName)} · {selectedManager.tournamentYear}
                {" · "}
                {localize(selectedManager.tacticalIdentity)}
              </small>
            </div>

            <dl
              className={
                isNeutralEra ? styles.previewMetricsNeutral : undefined
              }
            >
              {[
                [managerT("off"), selectedManager.grades.offense],
                [managerT("def"), selectedManager.grades.defense],
                [managerT("lead"), selectedManager.leadership],
                [managerT("game"), selectedManager.gameManagement],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {!isNeutralEra && (
                <div>
                  <dt>{managerT("eraFit")}</dt>
                  <dd>{calculateManagerEraFit(selectedManager, eraId).score}</dd>
                </div>
              )}
            </dl>

            <p className={styles.preferred}>
              <span>{t("preferred")}</span>
              {selectedManager.preferredFormations
                .map((formation) => formation.replaceAll("-", "–"))
                .join(" · ")}
            </p>
          </>
        ) : (
          <>
            <div className={styles.previewIdentity}>
              <span>{t("selectedManager")}</span>
              <strong className={styles.emptyTitle}>{t("noneSelected")}</strong>
              <small>{t("chooseToPreview")}</small>
            </div>

            <dl
              className={
                isNeutralEra ? styles.previewMetricsNeutral : undefined
              }
              aria-hidden
            >
              {[
                managerT("off"),
                managerT("def"),
                managerT("lead"),
                managerT("game"),
                ...(!isNeutralEra ? [managerT("eraFit")] : []),
              ].map((label) => (
                <div key={label} className={styles.emptyMetric}>
                  <dt>{label}</dt>
                  <dd>—</dd>
                </div>
              ))}
            </dl>

            <p className={`${styles.preferred} ${styles.emptyPreferred}`} aria-hidden>
              <span>{t("preferred")}</span>—
            </p>
          </>
        )}
      </aside>

      <div className={styles.poolHeader}>
        <span>
          {t("poolCount", { visible: visibleManagers.length, total: managers.length, era: eraT(`${era.id}.label`) })}
        </span>
        <small>
          {t("rankingDescription")}
        </small>
      </div>

      <div
        className={styles.pool}
        aria-label={t("availableManagers")}
        data-testid="free-manager-pool"
        data-legacy-testid="free-manager-archive"
      >
        {visibleManagers.map((manager) => {
          const selected = manager.id === selectedManagerId;
          const eraFit = isNeutralEra
            ? null
            : calculateManagerEraFit(manager, eraId).score;

          return (
            <article
              key={manager.id}
              className={`${styles.managerOption} ${
                styles[`style_${manager.style}`]
              }${selected ? ` ${styles.selected}` : ""}`}
            >
              <button
                type="button"
                className={`${styles.pick}${
                  isNeutralEra ? ` ${styles.pickNeutral}` : ""
                }`}
                aria-pressed={selected}
                aria-label={t("chooseAria", { manager: manager.managerName, team: localize(manager.teamName), year: manager.tournamentYear, eraFit: eraFit === null ? "" : t("eraFitSuffix", { fit: eraFit }) })}
                onClick={() => onSelect(manager.id)}
              >
                <span className={styles.rank}>#{ranks.get(manager.id)}</span>

                <span className={styles.portraitStage}>
                  <CircularPortrait
                    imageId={manager.imageId}
                    subjectName={manager.managerName}
                    era={manager.era}
                    countryCode={manager.countryCode}
                    tournamentYear={manager.tournamentYear}
                    size="compact"
                  />
                </span>

                <span className={styles.identity}>
                  <strong>{manager.managerName}</strong>
                  <small>
                    {flagForCountry(manager.countryCode)} {localize(manager.countryName)} ·{" "}
                    {manager.tournamentYear}
                  </small>
                  <i className={styles.tacticalBadge}>
                    <TacticalIcon style={manager.style} size={12} />
                    <span>{t("styleTactics", { style: localize(manager.style) })}</span>
                  </i>
                  <em>
                    {manager.preferredFormations
                      .map((formation) => formation.replaceAll("-", "–"))
                      .join(" · ")}
                  </em>
                </span>

                {eraFit !== null && (
                  <span className={styles.eraFit}>
                    <small>{managerT("eraFit")}</small>
                    <b>{eraFit}</b>
                  </span>
                )}

                {selected && (
                  <span className={styles.check} aria-hidden>
                    <Check size={14} />
                  </span>
                )}
              </button>

              <button
                type="button"
                className={styles.inspect}
                aria-label={t("viewProfileAria", { manager: manager.managerName, team: localize(manager.teamName), year: manager.tournamentYear })}
                onClick={(event) =>
                  onInspect(manager.id, event.currentTarget)
                }
              >
                {managerT("viewProfile")}
              </button>
            </article>
          );
        })}

        {visibleManagers.length === 0 && (
          <div className={styles.empty} role="status">
            {t("empty")}
          </div>
        )}
      </div>

      <div
        className={`${styles.confirm}${
          selectedManager ? "" : ` ${styles.confirmEmpty}`
        }`}
        aria-live="polite"
      >
        <div className={styles.confirmIdentity}>
          <span>{t("selectedManager")}</span>
          {selectedManager ? (
            <>
              <strong>{selectedManager.managerName}</strong>
              <small>
                {flagForCountry(selectedManager.countryCode)}{" "}
                {localize(selectedManager.teamName)} {selectedManager.tournamentYear} ·{" "}
                {localize(selectedManager.style)}
              </small>
            </>
          ) : (
            <>
              <strong className={styles.emptyConfirmTitle}>{t("noneSelectedShort")}</strong>
              <small>{t("selectToContinue")}</small>
            </>
          )}
        </div>

        <Button
          className={styles.continue}
          disabled={!selectedManager}
          onClick={onContinue}
        >
          {t("confirm")} <ArrowRight size={18} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
