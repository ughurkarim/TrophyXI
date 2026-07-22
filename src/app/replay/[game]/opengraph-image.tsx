import { ImageResponse } from "next/og";
import { getOpponentLabel } from "@/data/opponents";
import { decodeSharedGame, resolveSharedGame } from "@/lib/shared-game";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ game: string }> }) {
  const { game: token } = await params;
  const payload = decodeSharedGame(token);
  const replay = payload ? resolveSharedGame(payload) : null;
  const opponent = replay ? getOpponentLabel(replay.opponent) : "History";
  const score = replay ? `${replay.result.score.user} — ${replay.result.score.opponent}` : "XI";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", alignItems: "center", justifyContent: "center", color: "#f5f0df", background: "radial-gradient(circle at 50% 43%, #214c32 0%, #09110c 38%, #030504 78%)", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", inset: 28, display: "flex", border: "2px solid rgba(231,189,77,.42)", borderRadius: 28 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ color: "#e7bd4d", fontSize: 22, letterSpacing: 8 }}>TROPHY XI · FINAL RECORD</div>
        <div style={{ display: "flex", alignItems: "center", gap: 50, marginTop: 54 }}>
          <div style={{ width: 270, fontSize: 29, textAlign: "right" }}>TROPHY XI</div>
          <div style={{ color: "#f8f3e2", fontSize: 114, fontWeight: 700, letterSpacing: -8 }}>{score}</div>
          <div style={{ width: 270, fontSize: 29 }}>{opponent.toUpperCase()}</div>
        </div>
        <div style={{ marginTop: 56, color: "#9aa69e", fontSize: 25 }}>OPEN THE MATCH · SEE THE TEAMS · RELIVE THE TIMELINE</div>
      </div>
    </div>,
    size,
  );
}
