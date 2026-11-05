import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  ADMIN_STATUSES,
  cancelBooking,
  createPendingBooking,
  listAdminBookings,
  markBookingPaid,
  updateBookingGuest,
  updateBookingNote,
  updateBookingStatus,
  updateBookingStay,
} from "@/lib/inventory";

export const runtime = "nodejs";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function handleGET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookings = await listAdminBookings();
  return NextResponse.json({ bookings });
}

const createSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("reservation"),
    roomTypeId: z.string(),
    checkIn: isoDate,
    checkOut: isoDate,
    guests: z.number().int().min(1).max(8),
    guestName: z.string().trim().min(2),
    guestPhone: z.string().trim().min(6),
    guestEmail: z.union([z.string().trim().email(), z.literal("")]).default(""),
    source: z.enum(["phone", "walk_in", "email", "ota", "other"]).default("phone"),
    paid: z.boolean().default(false),
    amountOverrideInr: z.number().int().min(0).optional(),
    note: z.string().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("block"),
    roomTypeId: z.string(),
    checkIn: isoDate,
    checkOut: isoDate,
    units: z.number().int().min(1).max(20).default(1),
    reason: z.string().trim().max(200).default("Out of order"),
  }),
]);

const SOURCE_LABEL: Record<string, string> = {
  phone: "Phone",
  walk_in: "Walk-in",
  email: "Email",
  ota: "OTA",
  other: "Other",
};

async function handlePOST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the reservation details" }, { status: 400 });
  }
  const input = parsed.data;

  if (input.kind === "block") {
    const created = [];
    for (let i = 0; i < input.units; i++) {
      const result = await createPendingBooking({
        roomTypeId: input.roomTypeId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: 1,
        guestName: input.reason || "Out of order",
        guestEmail: "",
        guestPhone: "",
        paymentMethod: "at_hotel",
        block: true,
        adminNote: `Blocked by ${admin.email}`,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: created.length ? `Blocked ${created.length}; ${result.error}` : result.error, created },
          { status: 409 },
        );
      }
      created.push(result.booking);
    }
    return NextResponse.json({ bookings: created });
  }

  const note = [`Source: ${SOURCE_LABEL[input.source]}`, input.note?.trim()].filter(Boolean).join("\n");
  const result = await createPendingBooking({
    roomTypeId: input.roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    paymentMethod: "at_hotel",
    amountOverrideInr: input.amountOverrideInr,
    adminNote: note,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  if (input.paid) {
    const paid = await markBookingPaid(result.booking.id);
    if (paid.ok) return NextResponse.json({ booking: paid.booking });
  }
  return NextResponse.json({ booking: result.booking });
}

async function handlePATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action;
  if (!id) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  switch (action) {
    case "note": {
      if (typeof body.note !== "string") return NextResponse.json({ error: "Invalid note" }, { status: 400 });
      return NextResponse.json({ booking: await updateBookingNote(id, body.note) });
    }
    case "set_status": {
      if (!ADMIN_STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      const result = await updateBookingStatus(id, body.status);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
      return NextResponse.json({ booking: result.booking });
    }
    case "update_stay": {
      const parsed = z
        .object({
          checkIn: isoDate,
          checkOut: isoDate,
          roomTypeId: z.string().optional(),
          guests: z.number().int().min(1).max(8).optional(),
          repriceStay: z.boolean().optional(),
        })
        .safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Check the new dates" }, { status: 400 });
      const result = await updateBookingStay({ bookingId: id, ...parsed.data });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
      return NextResponse.json({ booking: result.booking });
    }
    case "update_guest": {
      const parsed = z
        .object({
          guestName: z.string().trim().min(2).optional(),
          guestEmail: z.union([z.string().trim().email(), z.literal("")]).optional(),
          guestPhone: z.string().trim().optional(),
          amountInr: z.number().int().min(0).optional(),
        })
        .safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Check the guest details" }, { status: 400 });
      const result = await updateBookingGuest({ bookingId: id, ...parsed.data });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
      return NextResponse.json({ booking: result.booking });
    }
    case "cancel":
    case "mark_paid": {
      const result = action === "cancel" ? await cancelBooking(id) : await markBookingPaid(id);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
      return NextResponse.json({ booking: result.booking });
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}

// Every handler answers in JSON, even when something unexpected fails.
export async function GET(...args: Parameters<typeof handleGET>) {
  try {
    return await handleGET(...args);
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(...args: Parameters<typeof handlePOST>) {
  try {
    return await handlePOST(...args);
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
