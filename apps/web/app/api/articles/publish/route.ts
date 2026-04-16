import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { publishArticleSchema } from "@news-provenance/shared";

import { apiError, requireSession } from "@/lib/auth";
import { computeRevisionHash } from "@/lib/articles";
import { decodeReceiptLogs } from "@/lib/contract";
import { prisma } from "@/lib/prisma";

const schema = publishArticleSchema.extend({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession("publisher");
    const payload = schema.parse(await request.json());
    if (session.walletAddress !== payload.walletAddress.toLowerCase()) {
      return apiError("Wallet mismatch", 403);
    }
    if (session.publisherId !== payload.publisherId) {
      return apiError("Publisher mismatch", 403);
    }

    const expectedHash = await computeRevisionHash({
      content: payload.content,
      publisherId: payload.publisherId,
      revisionNumber: 1,
      previousHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000"
    });

    const { receipt, logs } = await decodeReceiptLogs(payload.txHash as `0x${string}`);
    const event = logs.find((log) => log.eventName === "ArticlePublished");
    if (!event) {
      return apiError("Publish transaction did not emit ArticlePublished");
    }

    const args = event.args as Record<string, unknown>;
    if (
      String(args.publisherWallet).toLowerCase() !== payload.walletAddress.toLowerCase()
    ) {
      return apiError("Published wallet does not match the authenticated session");
    }
    if (String(args.contentHash).toLowerCase() !== expectedHash.toLowerCase()) {
      return apiError("On-chain hash does not match the computed article hash");
    }

    const article = await prisma.article.upsert({
      where: {
        slug: payload.slug
      },
      update: {
        title: payload.content.title,
        draftContent: payload.content,
        status: "PUBLISHED",
        chainArticleId: BigInt(args.articleId as bigint),
        currentRevision: 1,
        publishedAt: new Date(),
        revisions: {
          create: {
            revisionNumber: 1,
            contentJson: payload.content,
            contentHash: expectedHash,
            previousHash:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            changeNote: "Initial publication",
            editorWallet: payload.walletAddress.toLowerCase(),
            txHash: payload.txHash,
            blockNumber: receipt.blockNumber
          }
        }
      },
      create: {
        slug: payload.slug,
        externalId: payload.slug,
        publisherId: payload.publisherId,
        title: payload.content.title,
        draftContent: payload.content,
        status: "PUBLISHED",
        chainArticleId: BigInt(args.articleId as bigint),
        currentRevision: 1,
        publishedAt: new Date(),
        revisions: {
          create: {
            revisionNumber: 1,
            contentJson: payload.content,
            contentHash: expectedHash,
            previousHash:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            changeNote: "Initial publication",
            editorWallet: payload.walletAddress.toLowerCase(),
            txHash: payload.txHash,
            blockNumber: receipt.blockNumber
          }
        }
      },
      include: {
        revisions: {
          orderBy: {
            revisionNumber: "desc"
          }
        }
      }
    });

    return NextResponse.json({ article });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Publish failed");
  }
}
