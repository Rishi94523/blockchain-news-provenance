import { type JWTPayload, SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { env } from "./env";

const SESSION_COOKIE = "news_provenance_session";

export type SessionRole = "admin" | "publisher";

export interface SessionPayload extends JWTPayload {
  role: SessionRole;
  walletAddress: string;
  publisherId?: string;
  displayName?: string;
}

function secretKey() {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function createSessionCookie(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const result = await jwtVerify(token, secretKey());
    return result.payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
