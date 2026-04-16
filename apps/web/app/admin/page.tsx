import { AdminConsole } from "@/components/admin-console";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [session, publishers] = await Promise.all([
    getSession(),
    prisma.publisher.findMany({
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  return (
    <div className="section">
      <header className="section">
        <div className="eyebrow">Admin Registry</div>
        <h1 className="section-title" style={{ fontFamily: "var(--font-display), serif", fontSize: "clamp(2.8rem, 5vw, 4.6rem)" }}>
          Decide who is accountable enough to publish.
        </h1>
        <p className="lede">
          The system avoids content moderation, but it still requires an accountability layer. Only approved publisher wallets can create or revise chain-backed stories.
        </p>
      </header>
      <AdminConsole
        session={
          session
            ? {
                role: session.role,
                walletAddress: session.walletAddress
              }
            : null
        }
        publishers={publishers}
      />
    </div>
  );
}
