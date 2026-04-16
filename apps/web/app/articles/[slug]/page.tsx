import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifyArticleByIdOrSlug } from "@/lib/articles";
import { toJsonSafe } from "@/lib/json";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: {
      slug
    },
    include: {
      publisher: true,
      revisions: {
        orderBy: {
          revisionNumber: "desc"
        }
      }
    }
  });

  if (!article) {
    notFound();
  }

  const verification = await verifyArticleByIdOrSlug(article.slug);
  const current = article.revisions[0];
  const serialized = toJsonSafe(article);
  const currentContent = (current?.contentJson ?? {}) as {
    summary?: string;
    body?: string;
  };

  return (
    <div className="section">
      <div className="article-layout">
        <article className="panel utility-card">
          <div className="eyebrow">Tracked Article</div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display), serif", fontSize: "clamp(2.8rem, 5vw, 4.8rem)" }}>
            {serialized.title}
          </h1>
          <div className="pill-row">
            <span className="pill ok">{verification.status}</span>
            <span className="pill">{serialized.publisher.displayName}</span>
            <span className="pill">rev {serialized.currentRevision}</span>
          </div>
          <p className="lede">{currentContent.summary}</p>
          <div className="article-body">
            {String(currentContent.body ?? "")
              .split("\n")
              .filter(Boolean)
              .map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
          </div>
        </article>
        <aside className="panel utility-card">
          <header>
            <div className="eyebrow">Provenance</div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display), serif", fontSize: "2.2rem" }}>
              Revision trail
            </h2>
          </header>
          <div className="timeline">
            {serialized.revisions.map((revision) => (
              <article key={revision.id} className="timeline-card panel">
                <div className="pill-row">
                  <span className="pill">rev {revision.revisionNumber}</span>
                  <span className="pill">{new Date(revision.createdAt).toLocaleString()}</span>
                </div>
                <strong>{revision.changeNote}</strong>
                <div className="code">{revision.contentHash}</div>
                <div className="code">{revision.txHash}</div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
