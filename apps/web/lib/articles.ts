import {
  hashRevisionPayload,
  type ArticleContent,
  type VerificationResult
} from "@news-provenance/shared";

import { prisma } from "./prisma";
import { readArticleHead } from "./contract";

export async function computeRevisionHash(input: {
  content: ArticleContent;
  publisherId: string;
  revisionNumber: number;
  previousHash: string;
}) {
  return hashRevisionPayload({
    ...input.content,
    publisherId: input.publisherId,
    revisionNumber: input.revisionNumber,
    previousHash: input.previousHash
  });
}

export async function getPublishedArticles() {
  return prisma.article.findMany({
    where: {
      status: "PUBLISHED"
    },
    orderBy: {
      publishedAt: "desc"
    },
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
}

export async function verifyArticleByIdOrSlug(
  identifier: string
): Promise<VerificationResult> {
  const article = await prisma.article.findFirst({
    where: {
      OR: [{ id: identifier }, { slug: identifier }]
    },
    include: {
      publisher: true,
      revisions: {
        orderBy: {
          revisionNumber: "desc"
        }
      }
    }
  });

  if (!article || !article.chainArticleId) {
    return {
      status: "not_found",
      articleId: identifier,
      dbHash: null,
      chainHash: null,
      publisher: null,
      publishedAt: null,
      lastModifiedAt: null,
      revisionCount: 0
    };
  }

  const latestRevision = article.revisions[0];
  const chainHead = await readArticleHead(article.chainArticleId);
  const chainHash = chainHead.currentHash;
  const status = latestRevision.contentHash === chainHash ? "verified" : "mismatch";

  return {
    status,
    articleId: article.id,
    dbHash: latestRevision.contentHash,
    chainHash,
    publisher: {
      id: article.publisher.id,
      displayName: article.publisher.displayName,
      walletAddress: article.publisher.walletAddress
    },
    publishedAt: article.publishedAt?.toISOString() ?? null,
    lastModifiedAt: latestRevision.createdAt.toISOString(),
    revisionCount: article.revisions.length
  };
}
