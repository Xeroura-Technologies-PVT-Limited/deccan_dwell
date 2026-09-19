import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listGuestBookings } from "@/lib/inventory";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookings = await listGuestBookings({
    userId: session.id,
    email: session.email,
  });
  return NextResponse.json({ bookings });
}
