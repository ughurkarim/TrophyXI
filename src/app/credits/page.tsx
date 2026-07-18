import Link from "next/link";
import { ArrowLeft, ExternalLink, ImageIcon } from "lucide-react";
import { Wordmark } from "@/components/brand/mark";
import { historicalOpponentSource } from "@/data/opponents";
import { imageAttributions } from "@/data/player-images";

export default function CreditsPage() {
  const licensed = imageAttributions.filter((image) => !image.fallback);
  const playerPhotos = licensed.filter((image) => image.kind === "player");
  const managerPhotos = licensed.filter((image) => image.kind === "manager");
  const exactTournament = licensed.filter(
    (image) => image.exactTournamentImage,
  );
  const identityPhotos = licensed.filter(
    (image) => image.photoContext === "other-licensed-face",
  );
  const contextLabel = (photoContext: (typeof licensed)[number]["photoContext"]) =>
    ({
      "exact-tournament": "exact-tournament photograph",
      "same-year-national-team": "same-year national-team photograph",
      "nearby-year-national-team": "nearby-year national-team photograph",
      "other-licensed-face": "licensed identity photograph",
      "original-project-mark": "original project mark",
    })[photoContext];

  return (
    <div className="credits-page">
      <header className="credits-header">
        <div className="container">
          <Link href="/" aria-label="Trophy XI home"><Wordmark /></Link>
          <Link href="/" className="text-button"><ArrowLeft size={15} aria-hidden /> Home</Link>
        </div>
      </header>
      <main className="container credits-main">
        <section className="credits-hero">
          <span className="eyebrow eyebrow--gold">SOURCES & ATTRIBUTION</span>
          <h1>An archive with a paper trail.</h1>
          <p>
            Every selectable player and manager has a local transparent PNG and a
            complete source record. Every active face is a licensed photograph,
            stored locally and labeled with only the context its source supports.
          </p>
          <div className="credits-metrics">
            <span><b>{imageAttributions.length}</b> active local PNG masters</span>
            <span><b>{licensed.length}</b> licensed photographs</span>
            <span><b>{playerPhotos.length}</b> player photographs</span>
            <span><b>{managerPhotos.length}</b> manager photographs</span>
            <span><b>{exactTournament.length}</b> exact-tournament images</span>
            <span><b>{identityPhotos.length}</b> licensed identity images</span>
          </div>
        </section>

        <section className="credits-method">
          <div>
            <ImageIcon size={20} aria-hidden />
            <h2>Image method</h2>
            <p>
              The importer preserves licensed source files, makes a mechanical
              face-centered crop, exports a transparent 700×900 master, and rejects
              incomplete creator, license, or source metadata. Exact-tournament,
              same-year, nearby-year, and identity-only contexts are recorded
              separately and never inferred from a PNG filename.
            </p>
          </div>
          <div>
            <h2>Data method</h2>
            <p>
              Game ratings and attributes are Trophy XI estimates. Tournament stats
              are nullable and appear only with card-level citations; unknown never
              means zero. Historical participant identity, tournament finish, and
              match counts come from{" "}
              <a href={historicalOpponentSource.url} target="_blank" rel="noreferrer">
                {historicalOpponentSource.label}
              </a>
              . Unsourced manager, lineup, and team-stat fields stay missing.
            </p>
          </div>
        </section>

        {licensed.length > 0 && (
          <section className="attribution-section">
            <span className="eyebrow eyebrow--gold">LICENSED PHOTOGRAPHS</span>
            <h2>Source records</h2>
            <div className="attribution-list">
              {licensed.map((image) => (
                <article key={image.id}>
                  <div>
                    <b>{image.subjectName} {image.tournamentYear}</b>
                    <span>
                      {image.author} · {image.license} ·{" "}
                      {image.exactTournamentImage
                        ? "exact tournament"
                        : contextLabel(image.photoContext)}
                    </span>
                  </div>
                  {image.sourcePage && (
                    <a href={image.sourcePage} target="_blank" rel="noreferrer">
                      Source <ExternalLink size={13} aria-hidden />
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
