import Link from "next/link";
import { ArrowLeft, ExternalLink, ImageIcon } from "lucide-react";
import { Wordmark } from "@/components/brand/mark";
import { historicalOpponentSource } from "@/data/opponents/generated";
import { imageAttributions } from "@/data/player-images";

export default function CreditsPage() {
  const licensed = imageAttributions.filter((image) => !image.fallback);
  const fallbacks = imageAttributions.filter((image) => image.fallback);
  const exactTournament = licensed.filter(
    (image) => image.exactTournamentImage,
  );
  const nationalTeam = licensed.filter((image) => image.isNationalTeamKit);
  const nearbyYear = licensed.filter(
    (image) =>
      image.isNationalTeamKit &&
      !image.exactTournamentImage &&
      image.photographedYear !== null,
  );

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
            complete manifest record. Photography is never silently hotlinked, and
            an illustrated fallback is never presented as a real photograph.
          </p>
          <div className="credits-metrics">
            <span><b>{imageAttributions.length}</b> local PNG masters</span>
            <span><b>{licensed.length}</b> licensed photographs</span>
            <span><b>{nationalTeam.length}</b> national-team images</span>
            <span><b>{exactTournament.length}</b> exact-tournament images</span>
            <span><b>{nearbyYear.length}</b> nearby-year images</span>
            <span><b>{fallbacks.length}</b> intentional illustrations</span>
          </div>
        </section>

        <section className="credits-method">
          <div>
            <ImageIcon size={20} aria-hidden />
            <h2>Image method</h2>
            <p>
              The importer preserves licensed sources, requires a reviewed subject
              mask, exports a transparent 700×900 master, and rejects incomplete
              creator/license/source metadata. Exact-tournament, nearby-year
              national-team, other international, and fallback contexts are
              recorded separately and never inferred from a PNG filename.
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
                        : image.isNationalTeamKit
                          ? "nearby-year national team"
                          : "other licensed international"}
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

        <section className="attribution-section">
          <span className="eyebrow eyebrow--gold">ORIGINAL FALLBACK ART</span>
          <h2>Transparent illustrated subjects</h2>
          <p className="section-copy">
            Each file is generated as a distinct local master from an original
            Trophy XI template and labeled “Illustrated” on the card.
          </p>
          <div className="attribution-list attribution-list--dense">
            {fallbacks.map((image) => (
              <article key={image.id}>
                <div>
                  <b>{image.subjectName} {image.tournamentYear}</b>
                  <span>{image.kind} · {image.license}</span>
                </div>
                <code>{image.file}</code>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
