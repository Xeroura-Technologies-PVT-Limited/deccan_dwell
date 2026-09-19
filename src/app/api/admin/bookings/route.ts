import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { cancelBooking, listAdminBookings, markBookingPaid } from "@/lib/inventory";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookings = await listAdminBookings();
  return NextResponse.json({ bookings });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action;
  if (!id || (action !== "cancel" && action !== "mark_paid")) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const result =
    action === "cancel" ? await cancelBooking(id) : await markBookingPaid(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ booking: result.booking });
}
