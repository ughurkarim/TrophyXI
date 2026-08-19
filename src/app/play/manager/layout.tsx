import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Choose a World Cup Manager",
  description:
    "Choose a tournament manager whose tactics, leadership, attack, defense, and game management shape your Trophy XI.",
  robots: { index: false, follow: true },
};

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return children;
}
