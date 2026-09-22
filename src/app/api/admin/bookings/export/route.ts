import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listAdminBookings } from "@/lib/inventory";

export const runtime = "nodejs";

function csv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) || /^[=+\-@]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await listAdminBookings();
  const lines = [
    ["Booking ID", "Guest", "Email", "Phone", "Room", "Check in", "Check out", "Guests", "Status", "Amount INR", "Payment", "Payment ID", "Admin note", "Created at"].join(","),
    ...rows.map((row) => [row.id, row.guestName, row.guestEmail, row.guestPhone, row.roomName, row.checkIn, row.checkOut, row.guests, row.status, row.amountInr, row.paymentMethod, row.paymentId, row.adminNote, row.createdAt].map(csv).join(",")),
  ];
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="deccan-dwell-bookings.csv"`,
    },
  });
}