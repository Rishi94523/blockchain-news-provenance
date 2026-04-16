"use client";

import { useState } from "react";

type VerificationPayload = {
  status: "verified" | "mismatch" | "not_found";
  articleId: string;
  dbHash: string | null;
  chainHash: string | null;
  publisher: {
    id: string;
    displayName: string;
    walletAddress: string;
  } | null;
  publishedAt: string | null;
  lastModifiedAt: string | null;
  revisionCount: number;
};

export function VerifyClient({
  initialResults
}: {
  initialResults: VerificationPayload[];
}) {
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState<VerificationPayload | null>(null);
  const [status, setStatus] = useState("Enter an article slug or ID to compare the database state with the ledger.");

  async function verify() {
    try {
      setStatus("Checking the current database hash against the contract head...");
      const response = await fetch(`/api/verify/${encodeURIComponent(identifier)}`);
      const data = (await response.json()) as { error?: string; result?: VerificationPayload };
      if (!response.ok || !data.result) {
        throw new Error(data.error ?? "Verification failed");
      }
      setResult(data.result);
      setStatus("Verification complete.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Verification failed");
    }
  }

  return (
    <div className="section">
      <section className="panel utility-card">
        <header>
          <div className="eyebrow">Verification</div>
          <h1 className="section-title" style={{ fontFamily: "var(--font-display), serif", fontSize: "clamp(2.8rem, 5vw, 4.8rem)" }}>
            Ask the ledger.
          </h1>
          <p className="lede">
            This page does not decide whether an article is true. It only proves whether the current article state still matches its last anchored blockchain revision.
          </p>
        </header>
        <div className="cta-row">
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="article slug or UUID"
            style={{ minWidth: "18rem", flex: "1 1 22rem" }}
          />
          <button type="button" className="button-secondary" onClick={verify}>
            Verify article
          </button>
        </div>
        <p className="status-text">{status}</p>
      </section>

      {result ? (
        <section className="panel utility-card">
          <div className="pill-row">
            <span className={`pill ${result.status === "verified" ? "ok" : result.status === "mismatch" ? "warn" : ""}`}>
              {result.status}
            </span>
            <span className="pill">{result.revisionCount} revisions</span>
          </div>
          <strong>{result.publisher?.displayName ?? "Unknown publisher"}</strong>
          <div className="code">DB hash: {result.dbHash ?? "n/a"}</div>
          <div className="code">Chain hash: {result.chainHash ?? "n/a"}</div>
          <div className="muted">
            Published: {result.publishedAt ? new Date(result.publishedAt).toLocaleString() : "n/a"}
          </div>
          <div className="muted">
            Last modified: {result.lastModifiedAt ? new Date(result.lastModifiedAt).toLocaleString() : "n/a"}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display), serif", fontSize: "2.4rem" }}>
          Try a known article
        </h2>
        <div className="card-grid">
          {initialResults.map((entry) => (
            <article key={`${entry.articleId}-${entry.chainHash ?? "none"}`} className="panel utility-card">
              <div className="pill-row">
                <span className={`pill ${entry.status === "verified" ? "ok" : "warn"}`}>{entry.status}</span>
              </div>
              <strong>{entry.publisher?.displayName ?? entry.articleId}</strong>
              <div className="muted">{entry.articleId}</div>
              <div className="code">{entry.chainHash ?? "No chain hash"}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
