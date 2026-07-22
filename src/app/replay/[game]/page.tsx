import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedGameView } from "@/components/result/shared-game-view";
import { getOpponentLabel } from "@/data/opponents";
import { decodeSharedGame, resolveSharedGame } from "@/lib/shared-game";

type ReplayPageProps = { params: Promise<{ game: string }> };

export async function generateMetadata({ params }: ReplayPageProps): Promise<Metadata> {
  const { game: token } = await params;
  const payload = decodeSharedGame(token);
  const replay = payload ? resolveSharedGame(payload) : null;
  if (!replay) return { title: "Match unavailable" };
  const opponent = getOpponentLabel(replay.opponent);
  const title = `Trophy XI ${replay.result.score.user}–${replay.result.score.opponent} ${opponent}`;
  return {
    title,
    description: `View the complete Trophy XI match against ${opponent}: the teams, score, statistics, and full timeline.`,
    openGraph: {
      title,
      description: "A Trophy XI match record. Open it to inspect the exact teams and relive the game.",
      type: "website",
      images: [{ url: `/replay/${token}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, images: [`/replay/${token}/opengraph-image`] },
  };
}

export default async function ReplayPage({ params }: ReplayPageProps) {
  const { game: token } = await params;
  const payload = decodeSharedGame(token);
  const replay = payload ? resolveSharedGame(payload) : null;
  if (!replay) notFound();
  return <SharedGameView game={replay} />;
}
