import { NextResponse } from "next/server";
import { expireStaleHolds } from "@/lib/inventory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
  }
  if (configuredSecret && authorization !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expireStaleHolds();
  return NextResponse.json({ ok: true });
}