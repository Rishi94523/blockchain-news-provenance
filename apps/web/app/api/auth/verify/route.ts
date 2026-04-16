import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, verifySiweMessage } from "@/lib/auth";

const schema = z.object({
  message: z.string().min(10),
  signature: z.string().min(10)
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const session = await verifySiweMessage(body.message, body.signature);
    return NextResponse.json({ session });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Failed to verify signature",
      401
    );
  }
}
