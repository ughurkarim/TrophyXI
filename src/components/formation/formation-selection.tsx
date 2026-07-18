"use client";

import { ArrowRight, Crown, RefreshCw } from "lucide-react";
import { useState } from "react";
import { FormationCard } from "@/components/formation/formation-card";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { formations } from "@/data/formations";
import { calculateManagerFit } from "@/engine/chemistry";
import type {
  DraftEraId,
  FormationId,
  ManagerTournamentCard,
} from "@/types/game";

export function FormationSelection({
  manager,
  eraId,
  offerIds,
  formationRespinRemaining,
  onRespin,
  onContinue,
}: {
  manager: ManagerTournamentCard;
  eraId: DraftEraId;
  offerIds: FormationId[];
  formationRespinRemaining: number;
  onRespin: () => void;
  onContinue: (formationId: FormationId) => void;
}) {
  const offered = offerIds
    .map((id) => formations.find((formation) => formation.id === id))
    .filter((formation): formation is (typeof formations)[number] => Boolean(formation));
  const [selected, setSelected] = useState<FormationId>(offered[0]?.id ?? "4-3-3");
  const [showRespin, setShowRespin] = useState(false);
  const activeSelected = offered.some((item) => item.id === selected)
    ? selected
    : offered[0]?.id ?? "4-3-3";
  const formation =
    offered.find((item) => item.id === activeSelected) ??
    offered[0] ??
    formations[0];
  const era = getDraftEra(eraId);
  const managerFit = calculateManagerFit(manager, formation, eraId);

  return (
    <section className="formation-selection" aria-labelledby="formation-heading">
      <div className="game-intro">
        <p className="eyebrow eyebrow--gold">TACTICAL ROOM / STEP 03</p>
        <h1 id="formation-heading">Give the manager a system.</h1>
        <p>
          Every formation is viable. Compatibility shapes chemistry and creates a
          modest simulation edge. This four-shape offer is seeded by your
          environment, manager, and draft.
        </p>
      </div>
      <div className="formation-context">
        <span><Crown size={15} aria-hidden /> {manager.managerName} · {manager.style}</span>
        <span>{era.label} · {era.years}</span>
        <button
          type="button"
          className="button button--secondary formation-respin"
          disabled={formationRespinRemaining === 0}
          onClick={() => setShowRespin(true)}
        >
          <RefreshCw size={15} aria-hidden />
          {formationRespinRemaining
            ? "FORMATION RESPIN ×1"
            : "FORMATION RESPIN USED"}
        </button>
      </div>
      <div className="formation-grid">
        {offered.map((item) => (
          <FormationCard
            key={item.id}
            formation={item}
            selected={activeSelected === item.id}
            onSelect={() => setSelected(item.id)}
            managerFit={calculateManagerFit(manager, item, eraId)}
            eraCompatible={item.eraStrengths.includes(eraId)}
          />
        ))}
      </div>
      <div className="formation-continue">
        <div>
          <span className="eyebrow">SELECTED SYSTEM</span>
          <b>{formation.name} · {managerFit}% manager fit</b>
          <p>
            {era.label} · {formation.description}
          </p>
        </div>
        <Button onClick={() => onContinue(activeSelected)}>
          Enter the draft <ArrowRight size={17} aria-hidden />
        </Button>
      </div>
      {showRespin && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="formation-respin-title"
          >
            <span className="eyebrow eyebrow--gold">FORMATION RESPIN ×1</span>
            <h2 id="formation-respin-title">
              Replace all four formation choices?
            </h2>
            <p>
              The new deterministic offer keeps manager and era compatibility.
              This does not consume either player respin.
            </p>
            <div className="dialog__actions">
              <Button
                variant="secondary"
                onClick={() => setShowRespin(false)}
                autoFocus
              >
                Keep Formations
              </Button>
              <Button
                onClick={() => {
                  onRespin();
                  setShowRespin(false);
                }}
              >
                Use Formation Respin
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
