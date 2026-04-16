import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"]
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Origin Ledger",
  description:
    "Trace the origin, authorship, and modification history of news on a private Ethereum provenance ledger."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body
        style={{
          fontFamily: "var(--font-body), sans-serif"
        }}
      >
        <main>
          <div className="page-shell">
            <header className="topbar">
              <Link href="/" className="brand-mark">
                <strong>OL</strong>
                <span>Origin Ledger</span>
              </Link>
              <nav className="nav-links">
                <Link href="/verify">Verify</Link>
                <Link href="/dashboard">Publisher Desk</Link>
                <Link href="/admin">Admin</Link>
              </nav>
            </header>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
