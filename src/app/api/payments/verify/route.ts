import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmBooking, getBookingById } from "@/lib/inventory";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { sendBookingConfirmation } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({
  bookingId: z.string(),
  razorpay_order_id: z.string().min(3),
  razorpay_payment_id: z.string().min(3),
  razorpay_signature: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payment details missing" }, { status: 400 });
  }

  const booking = await getBookingById(parsed.data.bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (
    booking.razorpayOrderId &&
    booking.razorpayOrderId !== parsed.data.razorpay_order_id
  ) {
    return NextResponse.json({ error: "Order does not match this stay" }, { status: 409 });
  }

  const valid = verifyCheckoutSignature({
    orderId: parsed.data.razorpay_order_id,
    paymentId: parsed.data.razorpay_payment_id,
    signature: parsed.data.razorpay_signature,
  });
  if (!valid) {
    return NextResponse.json({ error: "Payment signature invalid" }, { status: 400 });
  }

  const result = await confirmBooking(booking.id, parsed.data.razorpay_payment_id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const email = await sendBookingConfirmation(result.booking);
  return NextResponse.json({ booking: result.booking, email });
}
