"use client";

import { ArrowRight, Crown } from "lucide-react";
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
  onContinue,
}: {
  manager: ManagerTournamentCard;
  eraId: DraftEraId;
  offerIds: FormationId[];
  onContinue: (formationId: FormationId) => void;
}) {
  const offered = offerIds
    .map((id) => formations.find((formation) => formation.id === id))
    .filter((formation): formation is (typeof formations)[number] => Boolean(formation));
  const [selected, setSelected] = useState<FormationId>(offered[0]?.id ?? "4-3-3");
  const formation =
    offered.find((item) => item.id === selected) ?? offered[0] ?? formations[0];
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
      </div>
      <div className="formation-grid">
        {offered.map((item) => (
          <FormationCard
            key={item.id}
            formation={item}
            selected={selected === item.id}
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
        <Button onClick={() => onContinue(selected)}>
          Enter the draft <ArrowRight size={17} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
