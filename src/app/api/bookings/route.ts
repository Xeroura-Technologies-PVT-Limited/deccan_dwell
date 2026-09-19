import { NextResponse } from "next/server";
import { z } from "zod";
import {
  attachRazorpayOrder,
  cancelBooking,
  createPendingBooking,
  HOLD_WINDOW_MINUTES,
} from "@/lib/inventory";
import {
  createRazorpayOrder,
  razorpayConfigured,
  razorpayKeyId,
} from "@/lib/razorpay";
import { getSession } from "@/lib/auth";
import { sendBookingConfirmation } from "@/lib/email";

export const runtime = "nodejs";

const createSchema = z.object({
  roomTypeId: z.string(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(6),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(8),
  paymentMethod: z.enum(["online", "at_hotel"]).default("online"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the booking details" }, { status: 400 });
  }

  const payAtHotel = parsed.data.paymentMethod === "at_hotel";

  if (!payAtHotel && !razorpayConfigured()) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured yet. Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and NEXT_PUBLIC_RAZORPAY_KEY_ID to .env.local.",
      },
      { status: 503 },
    );
  }

  const session = await getSession();
  const result = await createPendingBooking({
    ...parsed.data,
    userId: session?.id,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  if (payAtHotel) {
    const email = await sendBookingConfirmation(result.booking);
    return NextResponse.json({
      booking: result.booking,
      payment: {
        method: "at_hotel",
        amountInr: result.booking.amountInr,
        currency: "INR",
      },
      email,
    });
  }

  try {
    const order = await createRazorpayOrder({
      bookingId: result.booking.id,
      amountInr: result.booking.amountInr,
      guestName: result.booking.guestName,
      guestEmail: result.booking.guestEmail,
    });
    const booking = await attachRazorpayOrder(result.booking.id, order.id);
    return NextResponse.json({
      booking,
      holdMinutes: HOLD_WINDOW_MINUTES,
      payment: {
        configured: true,
        method: "online",
        provider: "razorpay",
        keyId: razorpayKeyId(),
        orderId: order.id,
        amountInr: booking.amountInr,
        amountPaise: booking.amountInr * 100,
        currency: "INR",
      },
    });
  } catch (err) {
    await cancelBooking(result.booking.id);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not start Razorpay checkout",
      },
      { status: 502 },
    );
  }
}
