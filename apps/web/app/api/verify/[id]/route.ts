import { NextRequest, NextResponse } from "next/server";

import { verifyArticleByIdOrSlug } from "@/lib/articles";
import { apiError } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await verifyArticleByIdOrSlug(id);
    return NextResponse.json({ result });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Verification failed");
  }
}
