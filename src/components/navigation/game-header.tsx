import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/mark";

export function GameHeader({
  step,
  utility,
}: {
  step: string;
  utility?: ReactNode;
}) {
  return (
    <header className="game-header">
      <div className="container game-header__inner">
        <Link
          className="game-header__brand"
          href="/"
          aria-label="Trophy XI home"
        >
          <Wordmark />
        </Link>
        <div className="game-header__step" aria-label={`Session ${step}`}>
          <span>SESSION</span>
          <b>{step}</b>
        </div>
        <div className="game-header__utility">{utility}</div>
      </div>
    </header>
  );
}