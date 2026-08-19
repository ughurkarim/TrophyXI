import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Draft World Cup Legends",
  description:
    "Draft tournament-specific World Cup legends and assemble a balanced starting XI and bench in Trophy XI.",
  robots: { index: false, follow: true },
};

export default function DraftLayout({ children }: { children: ReactNode }) {
  return children;
}
