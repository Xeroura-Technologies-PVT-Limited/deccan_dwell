import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_STATUSES, cancelBooking, listAdminBookings, markBookingPaid, updateBookingNote, updateBookingStatus } from "@/lib/inventory";

export const runtime = "nodejs";

async function handleGET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookings = await listAdminBookings();
  return NextResponse.json({ bookings });
}

async function handlePATCH(request: Request) {
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
