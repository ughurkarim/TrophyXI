import { getFormation } from "@/data/formations";
import { canonicalManagerIdFor, managersById } from "@/data/managers";
import { historicalOpponentsById } from "@/data/opponents";
import { playersById } from "@/data/players";
import { resolveWorldCupAllStars } from "@/engine/all-stars";
import { simulateMatch } from "@/engine/simulation";
import { createWorldCupRunOpponentField } from "@/engine/world-cup-run-opponents";
import type {
  DraftEraId,
  FormationId,
  HistoricalWorldCupTeam,
} from "@/types/game";

export type SharedGamePayload = {
  v: 1;
  e: DraftEraId;
  f: FormationId;
  m: string;
  l: string[];
  b: string[];
  o: string;
  s: number;
  d: number;
};

export type ResolvedSharedGame = ReturnType<typeof resolveSharedGame>;

const encodeUtf8 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
};

const decodeUtf8 = (value: string) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const encodeSharedGame = (payload: SharedGamePayload) =>
  encodeUtf8(JSON.stringify(payload));

export const decodeSharedGame = (token: string): SharedGamePayload | null => {
  try {
    const candidate = JSON.parse(decodeUtf8(token)) as Partial<SharedGamePayload>;
    if (
      candidate.v !== 1 ||
      typeof candidate.e !== "string" ||
      typeof candidate.f !== "string" ||
      typeof candidate.m !== "string" ||
      !Array.isArray(candidate.l) ||
      !Array.isArray(candidate.b) ||
      typeof candidate.o !== "string" ||
      typeof candidate.s !== "number" ||
      typeof candidate.d !== "number"
    ) {
      return null;
    }
    return candidate as SharedGamePayload;
  } catch {
    return null;
  }
};

const opponentForPayload = (
  payload: SharedGamePayload,
  excludedIdentityIds: string[],
): HistoricalWorldCupTeam | undefined => {
  const archived = historicalOpponentsById.get(payload.o);
  if (archived?.kind === "all-stars") {
    return resolveWorldCupAllStars(excludedIdentityIds);
  }
  if (archived) return archived;
  return createWorldCupRunOpponentField({
  seed: payload.d,
  }).find((candidate) => candidate.id === payload.o);
};

export function resolveSharedGame(payload: SharedGamePayload) {
  const formation = getFormation(payload.f);
  const manager = managersById.get(canonicalManagerIdFor(payload.m));
  if (!formation || !manager || payload.l.length !== 11 || payload.b.length !== 3) {
    return null;
  }
  const lineup = payload.l.map((id) => playersById.get(id));
  const bench = payload.b.map((id) => playersById.get(id));
  if (lineup.some((player) => !player) || bench.some((player) => !player)) {
    return null;
  }
  const resolvedLineup = lineup.flatMap((player) => (player ? [player] : []));
  const resolvedBench = bench.flatMap((player) => (player ? [player] : []));
  const picks = formation.slots.map((slot, index) => ({
    slotId: slot.id,
    cardId: resolvedLineup[index].id,
  }));
  const opponent = opponentForPayload(
    payload,
    [...resolvedLineup, ...resolvedBench].map((player) => player.playerIdentityId),
  );
  if (!opponent) return null;
  const result = simulateMatch({
    lineup: resolvedLineup,
    bench: resolvedBench,
    picks,
    formation,
    manager,
    eraId: payload.e,
    opponent,
    seed: payload.s,
  });
  return {
    payload,
    formation,
    manager,
    lineup: resolvedLineup,
    bench: resolvedBench,
    picks,
    opponent,
    result,
  };
}
