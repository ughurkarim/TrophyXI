import Link from "next/link";
import { ArrowLeft, ExternalLink, ImageIcon } from "lucide-react";
import { Wordmark } from "@/components/brand/mark";
import { draftEligibleManagers } from "@/data/managers";
import { historicalOpponentSource } from "@/data/opponents";
import { imageAttributions } from "@/data/player-images";
import { draftEligiblePlayers } from "@/data/players";

export default function CreditsPage() {
  const playerPhotos = imageAttributions.filter(
    (image) => image.kind === "player",
  );
  const managerPhotos = imageAttributions.filter(
    (image) => image.kind === "manager",
  );
  const pendingPlayerPhotos =
    draftEligiblePlayers.length - playerPhotos.length;
  const pendingManagerPhotos =
    draftEligibleManagers.length - managerPhotos.length;

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
            Faces resolve only from exact card-year local PNGs with complete
            source records. No older, newer, or identity-only photograph is
            substituted. Missing files remain draftable and show Photo Pending.
          </p>
          <div className="credits-metrics">
            <span><b>{imageAttributions.length}</b> active local PNG masters</span>
            <span><b>{playerPhotos.length}</b> exact-year player faces</span>
            <span><b>{managerPhotos.length}</b> exact-year manager faces</span>
            <span><b>{pendingPlayerPhotos}</b> photo-pending player cards</span>
            <span><b>{pendingManagerPhotos}</b> photo-pending manager cards</span>
          </div>
        </section>

        <section className="credits-method">
          <div>
            <ImageIcon size={20} aria-hidden />
            <h2>Image method</h2>
            <p>
              Players use <code>/players/game-faces/card-id.png</code> and
              managers use <code>/managers/game-faces/card-id.png</code>. Each
              version owns a distinct filename. A local file is activated only
              with complete reusable-source and exact-year metadata.
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

        {imageAttributions.length > 0 && (
          <section className="attribution-section">
            <span className="eyebrow eyebrow--gold">EXACT-YEAR LOCAL FACES</span>
            <h2>Source records</h2>
            <div className="attribution-list">
              {imageAttributions.map((image) => (
                <article key={image.id}>
                  <div>
                    <b>{image.subjectName} {image.tournamentYear}</b>
                    <span>
                      {image.author} · {image.license} ·{" "}
                      exact tournament
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
