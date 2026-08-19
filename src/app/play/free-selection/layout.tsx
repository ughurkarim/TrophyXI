import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Build Your World Cup XI",
  description:
    "Choose any tournament-specific players from the Trophy XI archive and create your ideal World Cup squad.",
  robots: { index: false, follow: true },
};

export default function FreeSelectionLayout({ children }: { children: ReactNode }) {
  return children;
}
