"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/brand/mark";
import { ButtonLink } from "@/components/ui/button";

const links = [
  { label: "Database", href: "/database" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Champions", href: "/#champions" },
  { label: "Credits", href: "/credits" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand-link" aria-label="Trophy XI home">
          <Wordmark />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map((link) => (
            <Link key={link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <ButtonLink href="/play/era" className="header-cta">
            Play now
          </ButtonLink>
          <button
            className="icon-button mobile-menu-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.label} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <ButtonLink href="/play/era">Build your XI</ButtonLink>
        </nav>
      )}
    </header>
  );
}
