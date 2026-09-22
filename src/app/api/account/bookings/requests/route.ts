import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createBookingRequest } from "@/lib/inventory";

export const runtime = "nodejs";

const requestSchema = z.object({
  bookingId: z.string().min(5),
  type: z.enum(["cancellation", "date_change"]),
  requestedCheckIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  requestedCheckOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await createBookingRequest({ ...parsed.data, userId: session.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ request: result.request }, { status: 201 });
}