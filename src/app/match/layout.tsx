import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Football Match Simulation",
  description:
    "Watch your Trophy XI face a historical World Cup opponent in the seeded match simulation engine.",
  robots: { index: false, follow: true },
};

export default function MatchLayout({ children }: { children: ReactNode }) {
  return children;
}
