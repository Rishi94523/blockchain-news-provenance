import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { articleContentSchema } from "@news-provenance/shared";

import { apiError, requireSession } from "@/lib/auth";
import { computeRevisionHash } from "@/lib/articles";
import { decodeReceiptLogs } from "@/lib/contract";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  content: articleContentSchema,
  changeNote: z.string().min(4).max(280),
  expectedRevision: z.number().int().positive(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession("publisher");
    const { id } = await context.params;
    const payload = schema.parse(await request.json());

    if (session.walletAddress !== payload.walletAddress.toLowerCase()) {
      return apiError("Wallet mismatch", 403);
    }

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        publisher: true,
        revisions: {
          orderBy: {
            revisionNumber: "desc"
          },
          take: 1
        }
      }
    });

    if (!article || !article.chainArticleId) {
      return apiError("Article not found", 404);
    }
    if (article.publisherId !== session.publisherId) {
      return apiError("Cannot revise another publisher's article", 403);
    }

    const latestRevision = article.revisions[0];
    const expectedHash = await computeRevisionHash({
      content: payload.content,
      publisherId: article.publisherId,
      revisionNumber: payload.expectedRevision + 1,
      previousHash: latestRevision.contentHash
    });

    const { receipt, logs } = await decodeReceiptLogs(payload.txHash as `0x${string}`);
    const event = logs.find((log) => log.eventName === "ArticleRevised");
    if (!event) {
      return apiError("Revision transaction did not emit ArticleRevised");
    }

    const args = event.args as Record<string, unknown>;
    if (BigInt(args.articleId as bigint) !== article.chainArticleId) {
      return apiError("Revision transaction targets the wrong chain article");
    }
    if (Number(args.revisionNumber) !== payload.expectedRevision + 1) {
      return apiError("Revision number mismatch");
    }
    if (String(args.contentHash).toLowerCase() !== expectedHash.toLowerCase()) {
      return apiError("On-chain hash does not match the computed revision hash");
    }

    const updated = await prisma.article.update({
      where: { id: article.id },
      data: {
        title: payload.content.title,
        draftContent: payload.content,
        currentRevision: payload.expectedRevision + 1,
        revisions: {
          create: {
            revisionNumber: payload.expectedRevision + 1,
            contentJson: payload.content,
            contentHash: expectedHash,
            previousHash: latestRevision.contentHash,
            changeNote: payload.changeNote,
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

    return NextResponse.json({ article: updated });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Revision failed");
  }
}
