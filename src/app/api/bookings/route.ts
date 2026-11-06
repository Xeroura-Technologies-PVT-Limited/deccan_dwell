import { apiError } from "@/lib/api-errors";
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
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { sendBookingConfirmation } from "@/lib/email";

export const runtime = "nodejs";

const createSchema = z.object({
  roomTypeId: z.string().max(40),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(6),
  guestName: z.string().trim().min(2).max(80),
  guestEmail: z.string().email().max(160),
  guestPhone: z.string().trim().min(8).max(20),
  paymentMethod: z.enum(["online", "at_hotel"]).default("online"),
});

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the booking details" }, { status: 400 });
  }

  const payAtHotel = parsed.data.paymentMethod === "at_hotel";
  // Pay-at-hotel reservations hold a room with no money down, so they get a
  // tighter limit than online checkouts (which expire after 15 minutes).
  const ip = clientIp(request);
  const limit = payAtHotel
    ? await hit(`book-hotel:${ip}`, 4, 60 * 60)
    : await hit(`book-online:${ip}`, 15, 60 * 60);
  if (!limit.ok) {
    return tooMany(limit.retryAfter, "Too many reservations from this connection. Please call us on +91 9945 465 380 and we'll help you book.");
  }

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
    console.error("[razorpay order]", err);
    await cancelBooking(result.booking.id);
    return NextResponse.json(
      { error: "We couldn't start the online payment. Please try again, or choose Pay at hotel." },
      { status: 502 },
    );
  }
}

// Every handler answers in JSON, even when something unexpected fails.
export async function POST(...args: Parameters<typeof handlePOST>) {
  try {
    return await handlePOST(...args);
  } catch (error) {
    return apiError(error);
  }
}
