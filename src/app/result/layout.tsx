import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Match Result",
  description:
    "Review your Trophy XI match result, team ratings, lineup, opponent, and simulation outcome.",
  robots: { index: false, follow: true },
};

export default function ResultLayout({ children }: { children: ReactNode }) {
  return children;
}
