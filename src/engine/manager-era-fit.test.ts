import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managers, managersById } from "@/data/managers";
import { historicalOpponentsById } from "@/data/opponents";
import { playersById } from "@/data/players";
import { calculateManagerFit } from "@/engine/chemistry";
import { generateFormationOffer } from "@/engine/draft";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { calculateTeamRatings } from "@/engine/ratings";
import { simulateMatch } from "@/engine/simulation";

const formation = getFormation("4-3-3");
const lineup = [
  "manuel-neuer-2014",
  "paolo-maldini-1994",
  "fabio-cannavaro-2006",
  "franz-beckenbauer-1974",
  "cafu-2002",
  "lothar-matthaus-1990",
  "xavi-2010",
  "zinedine-zidane-1998",
  "kylian-mbappe-2022",
  "ronaldo-2002",
  "lionel-messi-2022",
].map((id) => playersById.get(id)!);
const bench = ["pele-1970", "diego-maradona-1986", "zico-1982"].map(
  (id) => playersById.get(id)!,
);

describe("manager Era Fit", () => {
  it("gives every manager a valid profile and a bounded score in every era", () => {
    for (const manager of managers) {
      expect(Object.values(manager.eraFitProfile)).toHaveLength(8);
      expect(
        Object.values(manager.eraFitProfile).every(
          (value) => value >= 0 && value <= 100,
        ),
      ).toBe(true);
      for (const era of draftEras) {
        const fit = calculateManagerEraFit(manager, era.id);
        expect(fit.score).toBeGreaterThanOrEqual(0);
        expect(fit.score).toBeLessThanOrEqual(100);
      }
      expect(calculateManagerEraFit(manager, "all").score).toBeLessThan(100);
    }
  });

  it("changes with the selected match environment and permits uncommon S fits", () => {
    const michels = managersById.get("rinus-michels-1974")!;
    expect(calculateManagerEraFit(michels, "2020s").score).toBeGreaterThan(
      calculateManagerEraFit(michels, "1970s").score,
    );
    expect(calculateManagerEraFit(michels, "2020s").score).toBeGreaterThanOrEqual(
      95,
    );
    expect(
      new Set(
        managers.map((manager) => calculateManagerEraFit(manager, "1970s").score),
      ).size,
    ).toBeGreaterThan(5);
  });

  it("feeds formation offers, tactical compatibility, and team chemistry", () => {
    const manager = managersById.get("louis-van-gaal-2014")!;
    const lowProfile = {
      ...manager,
      eraFitProfile: Object.fromEntries(
        Object.keys(manager.eraFitProfile).map((key) => [key, 20]),
      ) as typeof manager.eraFitProfile,
    };
    const highProfile = {
      ...manager,
      eraFitProfile: Object.fromEntries(
        Object.keys(manager.eraFitProfile).map((key) => [key, 99]),
      ) as typeof manager.eraFitProfile,
    };

    expect(calculateManagerFit(highProfile, formation, "2020s")).toBeGreaterThan(
      calculateManagerFit(lowProfile, formation, "2020s"),
    );
    expect(generateFormationOffer(highProfile, "2020s", 7719)).not.toEqual(
      generateFormationOffer(lowProfile, "2020s", 7719),
    );

    const highRatings = calculateTeamRatings(lineup, formation, {
      manager: highProfile,
      eraId: "2020s",
    });
    const lowRatings = calculateTeamRatings(lineup, formation, {
      manager: lowProfile,
      eraId: "2020s",
    });
    expect(highRatings.managerFit).toBeGreaterThan(lowRatings.managerFit);
    expect(highRatings.chemistry).toBeGreaterThan(lowRatings.chemistry);
  });

  it("changes production match effectiveness without overpowering the lineup", () => {
    const manager = managersById.get("joachim-low-2014")!;
    const lowProfile = {
      ...manager,
      eraFitProfile: {
        ...manager.eraFitProfile,
        pressingIntensity: 30,
        defensiveStructure: 30,
        tempo: 30,
        positionalFlexibility: 30,
        substitutionApproach: 30,
        physicalDemand: 30,
        technicalDemand: 30,
        adaptability: 30,
      },
    };
    const highProfile = {
      ...manager,
      eraFitProfile: {
        ...manager.eraFitProfile,
        pressingIntensity: 96,
        defensiveStructure: 88,
        tempo: 94,
        positionalFlexibility: 94,
        substitutionApproach: 92,
        physicalDemand: 78,
        technicalDemand: 96,
        adaptability: 98,
      },
    };
    const base = {
      lineup,
      bench,
      formation,
      opponent: historicalOpponentsById.get("brazil-1970")!,
      eraId: "2020s" as const,
      seed: 2404,
    };
    const low = simulateMatch({ ...base, manager: lowProfile });
    const high = simulateMatch({ ...base, manager: highProfile });

    expect(high.stats.expectedGoals[0]).toBeGreaterThan(
      low.stats.expectedGoals[0],
    );
    expect(high.managerImpact).toContain("Era Fit");
    expect(high.userRatings.overall - low.userRatings.overall).toBeLessThan(8);
  });
});
