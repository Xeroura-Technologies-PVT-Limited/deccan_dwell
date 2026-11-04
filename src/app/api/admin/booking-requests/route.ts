import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listBookingRequests, reviewBookingRequest } from "@/lib/inventory";

export const runtime = "nodejs";

async function handleGET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ requests: await listBookingRequests() });
}

async function handlePATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || (body.status !== "approved" && body.status !== "rejected")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await reviewBookingRequest(body.id, body.status);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ request: result.request });
}

// Every handler answers in JSON, even when something unexpected fails.
export async function GET(...args: Parameters<typeof handleGET>) {
  try {
    return await handleGET(...args);
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(...args: Parameters<typeof handlePATCH>) {
  try {
    return await handlePATCH(...args);
  } catch (error) {
    return apiError(error);
  }
}
