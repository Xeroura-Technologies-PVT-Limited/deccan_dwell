import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listBookingRequests, reviewBookingRequest } from "@/lib/inventory";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ requests: await listBookingRequests() });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || (body.status !== "approved" && body.status !== "rejected")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await reviewBookingRequest(body.id, body.status);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ request: result.request });
}