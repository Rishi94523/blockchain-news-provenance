import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/auth";
import { toJsonSafe } from "@/lib/json";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const revisions = await prisma.revision.findMany({
      where: { articleId: id },
      orderBy: {
        revisionNumber: "asc"
      }
    });

    return NextResponse.json(toJsonSafe({ revisions }));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "History lookup failed");
  }
}
