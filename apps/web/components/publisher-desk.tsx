"use client";

import { useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";

import { hashRevisionPayload } from "@news-provenance/shared";

import { newsProvenanceAbi } from "@/lib/contract-abi";
import { WalletAuthPanel } from "./wallet-auth-panel";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

type SessionState = {
  role: "admin" | "publisher";
  walletAddress: string;
  publisherId?: string;
  displayName?: string;
} | null;

type DeskArticle = {
  id: string;
  slug: string;
  title: string;
  status: string;
  currentRevision: number;
  chainArticleId: string | null;
  draftContent: {
    title: string;
    body: string;
    summary: string;
    sourceLinks: string[];
  } | null;
  revisions: Array<{
    revisionNumber: number;
    contentHash: string;
    changeNote: string;
    txHash: string;
    contentJson: {
      title: string;
      body: string;
      summary: string;
      sourceLinks: string[];
    };
  }>;
};

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

function splitLinks(raw: string) {
  return raw
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function PublisherDesk({
  session,
  articles
}: {
  session: SessionState;
  articles: DeskArticle[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(articles[0]?.id ?? null);
  const selected = useMemo(
    () => articles.find((article) => article.id === selectedId) ?? null,
    [articles, selectedId]
  );

  const [slug, setSlug] = useState(selected?.slug ?? "");
  const [title, setTitle] = useState(selected?.draftContent?.title ?? "");
  const [summary, setSummary] = useState(selected?.draftContent?.summary ?? "");
  const [body, setBody] = useState(selected?.draftContent?.body ?? "");
  const [sourceLinks, setSourceLinks] = useState(
    selected?.draftContent?.sourceLinks.join("\n") ?? ""
  );
  const [changeNote, setChangeNote] = useState("Clarified context and updated sourcing.");
  const [status, setStatus] = useState(
    "Save drafts off-chain, then publish or revise them with your wallet."
  );
  const [busy, setBusy] = useState(false);

  function hydrateEditor(articleId: string) {
    const article = articles.find((entry) => entry.id === articleId);
    if (!article) {
      return;
    }
    setSelectedId(articleId);
    setSlug(article.slug);
    setTitle(article.draftContent?.title ?? article.title);
    setSummary(article.draftContent?.summary ?? "");
    setBody(article.draftContent?.body ?? "");
    setSourceLinks(article.draftContent?.sourceLinks.join("\n") ?? "");
  }

  async function withWallet() {
    if (!window.ethereum) {
      throw new Error("No injected EVM wallet found.");
    }

    const walletClient = createWalletClient({
      transport: custom(window.ethereum)
    });

    const [account] = await walletClient.requestAddresses();
    const publicClient = createPublicClient({
      transport: http(process.env.NEXT_PUBLIC_RPC_URL)
    });

    return { walletClient, publicClient, account };
  }

  function contentPayload() {
    return {
      title,
      body,
      summary,
      sourceLinks: splitLinks(sourceLinks)
    };
  }

  async function saveDraft() {
    if (!session?.publisherId) {
      setStatus("Sign in as an approved publisher first.");
      return;
    }

    try {
      setBusy(true);
      const response = await fetch("/api/articles/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          publisherId: session.publisherId,
          slug,
          content: contentPayload()
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Draft save failed");
      }

      setStatus("Draft saved to PostgreSQL. Reloading the desk...");
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Draft save failed");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!session?.publisherId) {
      setStatus("Sign in as an approved publisher first.");
      return;
    }

    try {
      setBusy(true);
      const { walletClient, publicClient, account } = await withWallet();
      const hash = hashRevisionPayload({
        ...contentPayload(),
        publisherId: session.publisherId,
        revisionNumber: 1,
        previousHash: ZERO_HASH
      });

      const txHash = await walletClient.writeContract({
        account,
        chain: undefined,
        address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
        abi: newsProvenanceAbi,
        functionName: "publishArticle",
        args: [slug, hash as `0x${string}`, `article://${slug}`]
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const response = await fetch("/api/articles/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          publisherId: session.publisherId,
          slug,
          content: contentPayload(),
          contentRef: `article://${slug}`,
          walletAddress: account,
          txHash
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Publish persistence failed");
      }

      setStatus("Article published on-chain and saved off-chain. Reloading...");
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function revise() {
    if (!selected?.chainArticleId || !session?.publisherId) {
      setStatus("Select a published article before revising.");
      return;
    }

    try {
      setBusy(true);
      const { walletClient, publicClient, account } = await withWallet();
      const latest = selected.revisions[0];
      const revisionNumber = selected.currentRevision + 1;

      const hash = hashRevisionPayload({
        ...contentPayload(),
        publisherId: session.publisherId,
        revisionNumber,
        previousHash: latest.contentHash
      });

      const txHash = await walletClient.writeContract({
        account,
        chain: undefined,
        address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
        abi: newsProvenanceAbi,
        functionName: "reviseArticle",
        args: [
          BigInt(selected.chainArticleId),
          BigInt(selected.currentRevision),
          hash as `0x${string}`,
          latest.contentHash as `0x${string}`,
          changeNote
        ]
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const response = await fetch(`/api/articles/${selected.id}/revise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: contentPayload(),
          changeNote,
          expectedRevision: selected.currentRevision,
          walletAddress: account,
          txHash
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Revision persistence failed");
      }

      setStatus("Revision anchored to the ledger. Reloading...");
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Revision failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <WalletAuthPanel
        session={session}
        heading="Publisher signature required"
        detail="Drafts live in PostgreSQL. Publish and revise actions are signed by the publisher wallet and then reconciled against the chain."
      />
      <div className="dashboard-grid">
        <section className="panel utility-card">
          <header>
            <div className="eyebrow">Compose</div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display), serif", fontSize: "2rem" }}>
              Newsroom desk
            </h2>
            <p className="muted">
              Use a slug as the public identifier. The same slug becomes the off-chain article key and the on-chain external ID.
            </p>
          </header>
          <div className="form-grid">
            <label className="field">
              <span>Slug</span>
              <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="market-watch-brief" />
            </label>
            <label className="field">
              <span>Headline</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ledger-backed market watch" />
            </label>
            <label className="field-full">
              <span>Summary</span>
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} />
            </label>
            <label className="field-full">
              <span>Body</span>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
            <label className="field-full">
              <span>Source links (one per line)</span>
              <textarea value={sourceLinks} onChange={(event) => setSourceLinks(event.target.value)} />
            </label>
            <label className="field-full">
              <span>Revision note</span>
              <input value={changeNote} onChange={(event) => setChangeNote(event.target.value)} />
            </label>
          </div>
          <div className="cta-row">
            <button type="button" className="button-ghost" disabled={busy || session?.role !== "publisher"} onClick={saveDraft}>
              Save draft
            </button>
            <button type="button" className="button-secondary" disabled={busy || session?.role !== "publisher"} onClick={publish}>
              Publish on chain
            </button>
            <button type="button" className="button" disabled={busy || session?.role !== "publisher" || !selected?.chainArticleId} onClick={revise}>
              Submit revision
            </button>
          </div>
          <p className="status-text">{status}</p>
        </section>
        <section className="panel utility-card">
          <header>
            <div className="eyebrow">Tracked Articles</div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display), serif", fontSize: "2rem" }}>
              Revision queue
            </h2>
          </header>
          <div className="timeline">
            {articles.length === 0 ? (
              <div className="empty-state">No drafts or publications yet. Save one to begin your revision chain.</div>
            ) : (
              articles.map((article) => (
                <article key={article.id} className="timeline-card panel">
                  <div className="pill-row">
                    <span className={`pill ${article.status === "PUBLISHED" ? "ok" : "warn"}`}>{article.status}</span>
                    <span className="pill">rev {article.currentRevision}</span>
                  </div>
                  <strong>{article.title}</strong>
                  <div className="muted">{article.slug}</div>
                  {article.revisions[0] ? (
                    <div className="code">Latest hash: {article.revisions[0].contentHash}</div>
                  ) : null}
                  <button type="button" className="button-ghost" onClick={() => hydrateEditor(article.id)}>
                    Load into editor
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
