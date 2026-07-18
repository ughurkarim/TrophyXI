import type { MatchResult } from "@/types/game";

export function MatchStats({
  result,
  opponentLabel,
}: {
  result: MatchResult;
  opponentLabel: string;
}) {
  const rows = [
    ["Possession", `${result.stats.possession[0]}%`, `${result.stats.possession[1]}%`],
    ["Shots", result.stats.shots[0], result.stats.shots[1]],
    ["On target", result.stats.shotsOnTarget[0], result.stats.shotsOnTarget[1]],
    ["Expected goals", result.stats.expectedGoals[0], result.stats.expectedGoals[1]],
    ["Yellow cards", result.stats.yellowCards[0], result.stats.yellowCards[1]],
    ["Tactical fit", result.stats.tacticalImpact[0], result.stats.tacticalImpact[1]],
  ];
  return (
    <div className="stats-table">
      <div className="stats-table__head">
        <b>TROPHY XI</b>
        <span>MATCH STATISTICS</span>
        <b>{opponentLabel.toLocaleUpperCase()}</b>
      </div>
      {rows.map(([label, user, opponent]) => {
        const userNumber = Number.parseFloat(String(user));
        const opponentNumber = Number.parseFloat(String(opponent));
        return (
          <div className="stat-row" key={label}>
            <b>{user}</b>
            <div>
              <span>{label}</span>
              <div>
                <i
                  className="stat-bar stat-bar--user"
                  style={{
                    width: `${
                      userNumber + opponentNumber === 0
                        ? 50
                        : (userNumber / (userNumber + opponentNumber)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
            <b>{opponent}</b>
          </div>
        );
      })}
    </div>
  );
}
