import { randomUUID } from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SiweMessage } from "siwe";

import { prisma } from "./prisma";
import { createSessionCookie, getSession } from "./session";
import { env } from "./env";

const NONCE_COOKIE = "news_provenance_nonce";

export async function issueNonce() {
  const nonce = randomUUID();
  const store = await cookies();
  store.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return nonce;
}

export async function verifySiweMessage(message: string, signature: string) {
  const store = await cookies();
  const expectedNonce = store.get(NONCE_COOKIE)?.value;
  if (!expectedNonce) {
    throw new Error("Missing nonce");
  }

  const siwe = new SiweMessage(message);
  const result = await siwe.verify({
    signature,
    nonce: expectedNonce,
    domain: new URL(env.appUrl).host
  });

  const walletAddress = result.data.address.toLowerCase();
  if (walletAddress === env.adminWalletAddress) {
    await createSessionCookie({
      role: "admin",
      walletAddress
    });
    store.delete(NONCE_COOKIE);
    return { role: "admin" as const, walletAddress };
  }

  const publisher = await prisma.publisher.findUnique({
    where: {
      walletAddress
    }
  });

  if (!publisher || publisher.status !== "APPROVED") {
    throw new Error("Wallet is not an approved publisher");
  }

  await createSessionCookie({
    role: "publisher",
    walletAddress,
    publisherId: publisher.id,
    displayName: publisher.displayName
  });
  store.delete(NONCE_COOKIE);

  return {
    role: "publisher" as const,
    walletAddress,
    publisherId: publisher.id,
    displayName: publisher.displayName
  };
}

export async function requireSession(role?: "admin" | "publisher") {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  if (role && session.role !== role) {
    throw new Error("Forbidden");
  }
  return session;
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
