import Link from "next/link";
import { Wordmark } from "@/components/brand/mark";

export function Footer() {
  return (
    <footer className="footer" id="about">
      <div className="container footer__inner">
        <div>
          <Link href="/" aria-label="Trophy XI home">
            <Wordmark />
          </Link>
          <p>Build the XI. Beat history.</p>
        </div>
        <p className="footer__tagline">Fourteen players. One match.</p>
      </div>
    </footer>
  );
}
