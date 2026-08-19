import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Choose Your Football Formation",
  description:
    "Choose the formation and tactical shape for your Trophy XI before building the squad.",
  robots: { index: false, follow: true },
};

export default function FormationLayout({ children }: { children: ReactNode }) {
  return children;
}
