import Link from "next/link";
import { Wordmark } from "@/components/brand/mark";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const common = useTranslations("common");
  return (
    <footer className="footer" id="about">
      <div className="container footer__inner">
        <div>
          <Link href="/" aria-label={common("brandHome")}>
            <Wordmark />
          </Link>
          <p>{t("tagline")}</p>
        </div>
        <p className="footer__tagline">{t("matchTagline")}</p>
      </div>
    </footer>
  );
}
