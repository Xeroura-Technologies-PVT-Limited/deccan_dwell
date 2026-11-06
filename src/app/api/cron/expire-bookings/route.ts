import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { expireStaleHolds } from "@/lib/inventory";
import { purgeExpiredHits } from "@/lib/rate-limit";

export const runtime = "nodejs";

async function handleGET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!configuredSecret) {
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }
  if (authorization !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expireStaleHolds();
  await purgeExpiredHits();
  return NextResponse.json({ ok: true });
}

// Every handler answers in JSON, even when something unexpected fails.
export async function GET(...args: Parameters<typeof handleGET>) {
  try {
    return await handleGET(...args);
  } catch (error) {
    return apiError(error);
  }
}
