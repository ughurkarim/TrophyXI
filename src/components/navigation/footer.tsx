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
        <p className="footer__disclaimer">
          Trophy XI is an unofficial historical soccer simulation project and is not
          affiliated with or endorsed by FIFA, any national federation, competition,
          team, manager, or player. Ratings are original game estimates. Images are
          locally stored, permissioned faces with manifest-tracked attribution.{" "}
          <Link href="/credits">View sources and attribution</Link>
        </p>
      </div>
    </footer>
  );
}
