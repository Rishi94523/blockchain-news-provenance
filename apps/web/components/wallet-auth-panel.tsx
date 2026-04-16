"use client";

import { useMemo, useState } from "react";
import { SiweMessage } from "siwe";

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

interface WalletAuthPanelProps {
  session: SessionState;
  heading: string;
  detail: string;
}

export function WalletAuthPanel({
  session,
  heading,
  detail
}: WalletAuthPanelProps) {
  const [status, setStatus] = useState("Wallet session not established.");
  const [loading, setLoading] = useState(false);

  const connectedLabel = useMemo(() => {
    if (!session) {
      return "Connect a wallet and sign once to unlock this area.";
    }
    return `Signed in as ${session.walletAddress}`;
  }, [session]);

  async function signIn() {
    if (!window.ethereum) {
      setStatus("No injected wallet detected. Install MetaMask or another EVM wallet.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Requesting wallet access...");

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts"
      })) as string[];

      const walletAddress = accounts[0];
      const nonceResponse = await fetch("/api/auth/nonce");
      const { nonce } = (await nonceResponse.json()) as { nonce: string };

      const message = new SiweMessage({
        domain: window.location.host,
        address: walletAddress,
        statement: "Sign in to Origin Ledger",
        uri: window.location.origin,
        version: "1",
        chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337"),
        nonce
      });

      const prepared = message.prepareMessage();
      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [prepared, walletAddress]
      })) as string;

      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: prepared,
          signature
        })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "SIWE verification failed");
      }

      setStatus("Session established. Reloading...");
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <section className="panel utility-card">
      <header>
        <div className="eyebrow">Wallet Access</div>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display), serif", fontSize: "2rem" }}>
          {heading}
        </h2>
        <p className="muted">{detail}</p>
      </header>
      <div className="pill-row">
        <span className={`pill ${session ? "ok" : "warn"}`}>{connectedLabel}</span>
        {session?.role ? <span className="pill">{session.role}</span> : null}
      </div>
      <p className="status-text">{status}</p>
      {session ? (
        <button type="button" className="button-ghost" onClick={logout}>
          End session
        </button>
      ) : (
        <button type="button" className="button-secondary" onClick={signIn} disabled={loading}>
          {loading ? "Signing..." : "Connect and sign"}
        </button>
      )}
    </section>
  );
}
