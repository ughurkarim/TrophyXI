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
  onContinue,
}: {
  manager: ManagerTournamentCard;
  eraId: DraftEraId;
  onContinue: (formationId: FormationId) => void;
}) {
  const [selected, setSelected] = useState<FormationId>("4-3-3");
  const formation = formations.find((item) => item.id === selected)!;
  const era = getDraftEra(eraId);
  const managerFit = calculateManagerFit(manager, formation, eraId);

  return (
    <section className="formation-selection" aria-labelledby="formation-heading">
      <div className="game-intro">
        <p className="eyebrow eyebrow--gold">TACTICAL ROOM / STEP 03</p>
        <h1 id="formation-heading">Give the manager a system.</h1>
        <p>
          Every formation is viable. Compatibility shapes chemistry and creates a
          modest simulation edge without overpowering player quality.
        </p>
      </div>
      <div className="formation-context">
        <span><Crown size={15} aria-hidden /> {manager.managerName} · {manager.style}</span>
        <span>{era.label} · {era.years}</span>
      </div>
      <div className="formation-grid">
        {formations.map((item) => (
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
