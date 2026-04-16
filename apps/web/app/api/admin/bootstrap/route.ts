import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST() {
  const existing = await prisma.article.count();
  if (existing > 0) {
    return NextResponse.json({ seeded: false, reason: "Already has data" });
  }

  await prisma.publisher.create({
    data: {
      id: "daily-ledger",
      displayName: "Daily Ledger",
      walletAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      status: "APPROVED"
    }
  });

  return NextResponse.json({ seeded: true });
}
