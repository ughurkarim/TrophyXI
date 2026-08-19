import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Choose a Football Era",
  description:
    "Choose the football era that sets the match environment for your Trophy XI team.",
  robots: { index: false, follow: true },
};

export default function EraLayout({ children }: { children: ReactNode }) {
  return children;
}
