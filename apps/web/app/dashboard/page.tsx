import { PublisherDesk } from "@/components/publisher-desk";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toJsonSafe } from "@/lib/json";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const articles =
    session?.publisherId
      ? await prisma.article.findMany({
          where: {
            publisherId: session.publisherId
          },
          orderBy: {
            updatedAt: "desc"
          },
          include: {
            revisions: {
              orderBy: {
                revisionNumber: "desc"
              }
            }
          }
        })
      : [];

  return (
    <div className="section">
      <header className="section">
        <div className="eyebrow">Publisher Desk</div>
        <h1 className="section-title" style={{ fontFamily: "var(--font-display), serif", fontSize: "clamp(2.8rem, 5vw, 4.6rem)" }}>
          Write first. Prove responsibly.
        </h1>
        <p className="lede">
          This desk keeps drafts practical and publishing cryptographic. The database stores readable content; the ledger stores immutable authorship and revision proof.
        </p>
      </header>
      <PublisherDesk
        session={session}
        articles={
          toJsonSafe(articles) as unknown as Parameters<
            typeof PublisherDesk
          >[0]["articles"]
        }
      />
    </div>
  );
}
