"use client";

import { useState } from "react";

import { WalletAuthPanel } from "./wallet-auth-panel";

type PublisherRecord = {
  id: string;
  displayName: string;
  walletAddress: string;
  status: string;
};

type SessionState = {
  role: "admin" | "publisher";
  walletAddress: string;
} | null;

export function AdminConsole({
  session,
  publishers
}: {
  session: SessionState;
  publishers: PublisherRecord[];
}) {
  const [publisherId, setPublisherId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [status, setStatus] = useState("Approve or revoke a publisher wallet.");
  const [pending, setPending] = useState(false);

  async function submit(action: "approve" | "revoke") {
    try {
      setPending(true);
      const response = await fetch("/api/admin/publishers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          publisherId,
          displayName,
          walletAddress
        })
      });

      const data = (await response.json()) as { error?: string; txHash?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Admin action failed");
      }

      setStatus(`${action} successful. Chain transaction: ${data.txHash}`);
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Admin action failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="section">
      <WalletAuthPanel
        session={session}
        heading="Admin signature required"
        detail="Publisher approval is an on-chain admin action signed by the configured owner wallet."
      />
      <div className="dashboard-grid">
        <section className="panel utility-card">
          <header>
            <div className="eyebrow">Approve Publishers</div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display), serif", fontSize: "2rem" }}>
              Curate accountable voices
            </h2>
          </header>
          <div className="form-grid">
            <label className="field">
              <span>Publisher ID</span>
              <input value={publisherId} onChange={(event) => setPublisherId(event.target.value)} placeholder="daily-ledger" />
            </label>
            <label className="field">
              <span>Display name</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Daily Ledger" />
            </label>
            <label className="field-full">
              <span>Wallet address</span>
              <input value={walletAddress} onChange={(event) => setWalletAddress(event.target.value)} placeholder="0x..." />
            </label>
          </div>
          <div className="cta-row">
            <button type="button" className="button-secondary" disabled={pending || session?.role !== "admin"} onClick={() => submit("approve")}>
              Approve on chain
            </button>
            <button type="button" className="button-ghost" disabled={pending || session?.role !== "admin"} onClick={() => submit("revoke")}>
              Revoke access
            </button>
          </div>
          <p className="status-text">{status}</p>
        </section>
        <section className="panel utility-card">
          <header>
            <div className="eyebrow">Current Registry</div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display), serif", fontSize: "2rem" }}>
              Approved identities
            </h2>
          </header>
          <div className="timeline">
            {publishers.length === 0 ? (
              <div className="empty-state">No publishers approved yet.</div>
            ) : (
              publishers.map((publisher) => (
                <article key={publisher.walletAddress} className="timeline-card panel">
                  <div className="pill-row">
                    <span className={`pill ${publisher.status === "APPROVED" ? "ok" : "warn"}`}>{publisher.status}</span>
                    <span className="pill">{publisher.id}</span>
                  </div>
                  <strong>{publisher.displayName}</strong>
                  <div className="code">{publisher.walletAddress}</div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
