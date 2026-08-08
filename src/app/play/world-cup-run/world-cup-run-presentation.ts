import type {
  WorldCupRunStage,
  WorldCupRunStatus,
} from "@/engine/world-cup-run";

type TrackableWorldCupRunStage = Exclude<WorldCupRunStage, "complete">;

/**
 * The tournament engine may already point at the next round when it records
 * an elimination. Mobile end-state presentation must keep highlighting the
 * round Trophy XI actually exited.
 */
export const getMobileTournamentProgressStage = ({
  currentStage,
  status,
  eliminatedStage,
}: {
  currentStage: WorldCupRunStage;
  status: WorldCupRunStatus;
  eliminatedStage: TrackableWorldCupRunStage | null;
}): WorldCupRunStage =>
  status === "eliminated" && eliminatedStage
    ? eliminatedStage
    : currentStage;
