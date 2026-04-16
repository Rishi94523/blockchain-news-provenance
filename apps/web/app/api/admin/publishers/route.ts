import { NextRequest, NextResponse } from "next/server";

import { adminPublisherActionSchema } from "@news-provenance/shared";

import { apiError, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAdminContract } from "@/lib/contract";

export async function POST(request: NextRequest) {
  try {
    await requireSession("admin");
    const payload = adminPublisherActionSchema.parse(await request.json());
    const walletAddress = payload.walletAddress.toLowerCase();

    if (payload.action === "approve") {
      if (!payload.displayName) {
        return apiError("displayName is required when approving a publisher");
      }

      const { hash } = await writeAdminContract({
        functionName: "approvePublisher",
        args: [
          walletAddress as `0x${string}`,
          payload.publisherId,
          payload.displayName
        ]
      });

      const publisher = await prisma.publisher.upsert({
        where: {
          walletAddress
        },
        update: {
          id: payload.publisherId,
          displayName: payload.displayName,
          status: "APPROVED"
        },
        create: {
          id: payload.publisherId,
          displayName: payload.displayName,
          walletAddress,
          status: "APPROVED"
        }
      });

      return NextResponse.json({ publisher, txHash: hash });
    }

    const { hash } = await writeAdminContract({
      functionName: "revokePublisher",
      args: [walletAddress as `0x${string}`]
    });

    const publisher = await prisma.publisher.update({
      where: {
        walletAddress
      },
      data: {
        status: "REVOKED"
      }
    });

    return NextResponse.json({ publisher, txHash: hash });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Request failed", 400);
  }
}
