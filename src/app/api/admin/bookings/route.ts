import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_STATUSES, cancelBooking, listAdminBookings, markBookingPaid, updateBookingNote, updateBookingStatus } from "@/lib/inventory";

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
  if (!id || (action !== "cancel" && action !== "mark_paid" && action !== "set_status" && action !== "note")) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (action === "note") {
    if (typeof body.note !== "string") return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    return NextResponse.json({ booking: await updateBookingNote(id, body.note) });
  }
  if (action === "set_status") {
    if (!ADMIN_STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const result = await updateBookingStatus(id, body.status);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ booking: result.booking });
  }
  const result = action === "cancel" ? await cancelBooking(id) : await markBookingPaid(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ booking: result.booking });
}
