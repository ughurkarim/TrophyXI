import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { encodeSharedGame, decodeSharedGame, resolveSharedGame } from "@/lib/shared-game";

describe("shared games", () => {
  it("round-trips and reconstructs the exact deterministic match", () => {
    const formation = getFormation("4-3-3");
    const payload = {
      v: 1 as const,
      e: "2010s" as const,
      f: formation.id,
      m: "joachim-low-2014",
      l: [
        "manuel-neuer-2014",
        "roberto-carlos-2002",
        "fabio-cannavaro-2006",
        "carles-puyol-2010",
        "philipp-lahm-2014",
        "andrea-pirlo-2006",
        "xavi-2010",
        "luka-modric-2018",
        "kylian-mbappe-2022",
        "ronaldo-2002",
        "lionel-messi-2014",
      ],
      b: ["pele-1970", "diego-maradona-1986", "zico-1982"],
      o: "world-cup-all-stars",
      s: 1970,
      d: 2026,
    };

    const token = encodeSharedGame(payload);
    expect(token).not.toMatch(/[+/=]/);
    const decoded = decodeSharedGame(token);
    expect(decoded).toEqual(payload);

    const replay = resolveSharedGame(decoded!);
    expect(replay?.lineup).toHaveLength(11);
    expect(replay?.bench).toHaveLength(3);
    expect(replay?.result.opponentId).toBe("world-cup-all-stars");
    expect(resolveSharedGame(decoded!)?.result.score).toEqual(replay?.result.score);
  });

  it("rejects malformed replay links", () => {
    expect(decodeSharedGame("not-a-game")).toBeNull();
  });
});
