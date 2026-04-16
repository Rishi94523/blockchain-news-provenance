import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/auth";
import { toJsonSafe } from "@/lib/json";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        publisher: true,
        revisions: {
          orderBy: {
            revisionNumber: "desc"
          }
        }
      }
    });

    if (!article) {
      return apiError("Article not found", 404);
    }

    return NextResponse.json(toJsonSafe({ article }));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Article lookup failed");
  }
}
