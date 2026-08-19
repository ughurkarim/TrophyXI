import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "World Cup Tournament Simulator",
  description:
    "Take your Trophy XI squad through the group stage and knockout rounds in a simulated World Cup run.",
  robots: { index: false, follow: true },
};

export default function WorldCupRunLayout({ children }: { children: ReactNode }) {
  return children;
}
