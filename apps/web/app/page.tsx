import Link from "next/link";

import { getPublishedArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const totalRevisions = articles.reduce(
    (sum: number, article: (typeof articles)[number]) =>
      sum + article.revisions.length,
    0
  );

  return (
    <div className="section">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Immutable provenance, not censorship</div>
          <h1 style={{ fontFamily: "var(--font-display), serif" }}>
            News trust rebuilt around authorship and revision history.
          </h1>
          <p>
            Origin Ledger gives readers a way to inspect who published a story, when it first appeared, and every change made after publication. It does not moderate content. It exposes accountability.
          </p>
          <div className="cta-row">
            <Link href="/verify" className="button-secondary">
              Verify an article
            </Link>
            <Link href="/dashboard" className="button-ghost">
              Open publisher desk
            </Link>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <strong>{articles.length}</strong>
              <span className="muted">Tracked publications</span>
            </div>
            <div className="stat">
              <strong>{totalRevisions}</strong>
              <span className="muted">Anchored revisions</span>
            </div>
            <div className="stat">
              <strong>{new Set(articles.map((article) => article.publisherId)).size}</strong>
              <span className="muted">Verified publishers</span>
            </div>
          </div>
        </div>
        <aside className="panel hero-card">
          <div className="eyebrow">How the proof works</div>
          <div className="timeline">
            <article className="timeline-card panel">
              <strong>1. Save content off-chain</strong>
              <span className="muted">Headline, body, summary, and sources live in PostgreSQL for practical retrieval.</span>
            </article>
            <article className="timeline-card panel">
              <strong>2. Hash the canonical payload</strong>
              <span className="muted">The app computes a stable `keccak256` fingerprint, including the previous hash for ancestry.</span>
            </article>
            <article className="timeline-card panel">
              <strong>3. Anchor the revision on-chain</strong>
              <span className="muted">A private Ethereum contract records the publisher wallet, revision number, and content hash.</span>
            </article>
          </div>
        </aside>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ fontFamily: "var(--font-display), serif", fontSize: "clamp(2.4rem, 4vw, 4rem)" }}>
          Recently anchored stories
        </h2>
        <div className="card-grid">
          {articles.length === 0 ? (
            <div className="empty-state">
              No published stories yet. Approve a publisher, sign in, save a draft, then publish the first ledger-backed article.
            </div>
          ) : (
            articles.map((article) => (
              <article key={article.id} className="panel story-card">
                <header>
                  <div className="pill-row">
                    <span className="pill ok">verified publisher</span>
                    <span className="pill">rev {article.currentRevision}</span>
                  </div>
                  <strong style={{ fontSize: "1.35rem" }}>{article.title}</strong>
                  <div className="meta-row muted">
                    <span>{article.publisher.displayName}</span>
                    <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleString() : "unpublished"}</span>
                  </div>
                </header>
                <p className="muted">
                  {((article.revisions[0]?.contentJson as { summary?: string } | undefined)
                    ?.summary) ??
                    "No summary stored yet."}
                </p>
                <div className="cta-row">
                  <Link href={`/articles/${article.slug}`} className="button-ghost">
                    Read article
                  </Link>
                  <Link href={`/verify?article=${article.slug}`} className="button-secondary">
                    Verify proof
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
