import { RatingRing } from "@/components/ui/rating-ring";
import type { TeamRatings as Ratings } from "@/types/game";

type RatingView = Pick<
  Ratings,
  "attack" | "midfield" | "defense" | "chemistry" | "overall"
> &
  Partial<Omit<Ratings, "attack" | "midfield" | "defense" | "chemistry" | "overall">>;

export function TeamRatings({
  ratings,
  expanded = false,
}: {
  ratings: RatingView;
  expanded?: boolean;
}) {
  return (
    <>
      <div className="team-ratings" aria-label="Current team ratings">
        <RatingRing value={ratings.attack} label="ATK" compact />
        <RatingRing value={ratings.midfield} label="MID" compact />
        <RatingRing value={ratings.defense} label="DEF" compact />
        <RatingRing value={ratings.chemistry} label="CHEM" compact />
        <RatingRing value={ratings.overall} label="OVR" compact />
      </div>
      {expanded &&
        ratings.positionFit !== undefined &&
        ratings.eraFit !== undefined &&
        ratings.managerFit !== undefined && (
          <div className="fit-summary" aria-label="Team fit summary">
            <span>Position fit <b>{ratings.positionFit}</b></span>
            <span>Era fit <b>{ratings.eraFit}</b></span>
            <span>Manager fit <b>{ratings.managerFit}</b></span>
          </div>
        )}
    </>
  );
}
