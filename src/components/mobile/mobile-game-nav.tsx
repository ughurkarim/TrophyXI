"use client";

import { ChevronLeft, Database, Home, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./mobile-game-nav.module.css";

export function MobileGameNav({ step }: { step: string }) {
  const router = useRouter();

  return (
    <nav className={styles.nav} aria-label="Game navigation">
      <button type="button" onClick={() => router.back()} aria-label="Go back">
        <ChevronLeft size={20} aria-hidden />
        <span>Back</span>
      </button>
      <Link href="/">
        <Home size={19} aria-hidden />
        <span>Home</span>
      </Link>
      <span
        className={styles.session}
        aria-label={`Current session ${step}`}
        aria-current="step"
      >
        <Shield size={18} aria-hidden />
        <b>{step.split(" / ")[0]}</b>
      </span>
      <Link href="/database">
        <Database size={19} aria-hidden />
        <span>Players</span>
      </Link>
    </nav>
  );
}
