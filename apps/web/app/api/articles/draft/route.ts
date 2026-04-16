import { NextRequest, NextResponse } from "next/server";

import { saveDraftSchema } from "@news-provenance/shared";

import { apiError, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession("publisher");
    const payload = saveDraftSchema.parse(await request.json());

    if (session.publisherId !== payload.publisherId) {
      return apiError("Cannot save a draft for another publisher", 403);
    }

    const article = await prisma.article.upsert({
      where: {
        slug: payload.slug
      },
      update: {
        title: payload.content.title,
        draftContent: payload.content,
        status: "DRAFT"
      },
      create: {
        slug: payload.slug,
        externalId: payload.slug,
        publisherId: payload.publisherId,
        title: payload.content.title,
        draftContent: payload.content,
        status: "DRAFT"
      }
    });

    return NextResponse.json({ article });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to save draft");
  }
}
