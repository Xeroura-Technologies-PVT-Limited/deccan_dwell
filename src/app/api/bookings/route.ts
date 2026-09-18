import { NextResponse } from "next/server";
import { z } from "zod";
import {
  confirmBooking,
  createPendingBooking,
  HOLD_WINDOW_MINUTES,
} from "@/lib/inventory";

const createSchema = z.object({
  roomTypeId: z.string(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(6),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(8),
});

const confirmSchema = z.object({
  bookingId: z.string(),
  paymentId: z.string().min(3),
});

/**
 * POST — create a pending hold (15 min). Next: open Razorpay with booking.amountInr.
 * PATCH — confirm after Razorpay success / webhook (paymentId).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = createPendingBooking(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({
    booking: result.booking,
    holdMinutes: HOLD_WINDOW_MINUTES,
    /**
     * Razorpay next steps (wire keys in env):
     * 1. Create Razorpay order for booking.amountInr * 100 (paise)
     * 2. Open Checkout with order_id + prefill guest
     * 3. On success, PATCH this route with bookingId + paymentId
     * 4. Prefer verifying via Razorpay webhook in production
     */
    payment: {
      provider: "razorpay",
      amountInr: result.booking.amountInr,
      currency: "INR",
      notes: { bookingId: result.booking.id },
    },
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bookingId and paymentId required" }, { status: 400 });
  }

  const result = confirmBooking(parsed.data.bookingId, parsed.data.paymentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ booking: result.booking });
}
