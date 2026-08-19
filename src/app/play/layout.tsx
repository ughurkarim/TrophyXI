import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "World Cup Team Builder & Football Simulator",
  description:
    "Choose Classic Draft, Free Selection, or World Cup Run to build an all-time World Cup XI and simulate matches in Trophy XI.",
  alternates: {
    canonical: "/play",
  },
};

export default function PlayLayout({ children }: { children: ReactNode }) {
  return children;
}
