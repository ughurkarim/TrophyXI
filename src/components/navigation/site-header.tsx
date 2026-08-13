"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/brand/mark";
import { ButtonLink } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "./language-selector";

const links = [
  { key: "database", href: "/database" },
  { key: "howItWorks", href: "/#how-it-works" },
  { key: "champions", href: "/#champions" },
  { key: "engineering", href: "/engineering" },
] as const;

export function SiteHeader({ fixed = false }: { fixed?: boolean }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("navigation");
  const common = useTranslations("common");
  return (
    <header
      className={fixed ? "site-header site-header--fixed" : "site-header"}
    >
      <div className="container site-header__inner">
        <Link href="/" className="brand-link" aria-label={common("brandHome")}>
          <Wordmark />
        </Link>
        <nav className="desktop-nav" aria-label={t("primary")}>
          {links.map((link) => (
            <Link key={link.key} href={link.href}>
              {t(link.key)}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <ButtonLink href="/play" className="header-cta">
            {t("startDraft")}
          </ButtonLink>
          <LanguageSelector compact />
          <button
            className="icon-button mobile-menu-button"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label={t("mobile")}>
          {links.map((link) => (
            <Link key={link.key} href={link.href} onClick={() => setOpen(false)}>
              {t(link.key)}
            </Link>
          ))}
          <LanguageSelector />
          <ButtonLink href="/play">{t("startDraft")}</ButtonLink>
        </nav>
      )}
    </header>
  );
}
