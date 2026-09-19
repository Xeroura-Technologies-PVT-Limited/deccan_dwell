import { NextResponse } from "next/server";
import { confirmBooking, getBookingById, getBookingByOrderId } from "@/lib/inventory";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { sendBookingConfirmation } from "@/lib/email";

export const runtime = "nodejs";

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  notes?: { bookingId?: string };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let payload: {
    event?: string;
    payload?: { payment?: { entity?: RazorpayPaymentEntity } };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = payload.event ?? "";
  if (event !== "payment.captured" && event !== "order.paid") {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const entity = payload.payload?.payment?.entity;
  const paymentId = entity?.id;
  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const byNotes = entity?.notes?.bookingId
    ? await getBookingById(entity.notes.bookingId)
    : null;
  const byOrder = entity?.order_id
    ? await getBookingByOrderId(entity.order_id)
    : null;
  const booking = byNotes ?? byOrder;
  if (!booking) {
    return NextResponse.json({ ok: true, unmatched: true });
  }

  const result = await confirmBooking(booking.id, paymentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  if (booking.status !== "confirmed") {
    await sendBookingConfirmation(result.booking);
  }
  return NextResponse.json({ ok: true, bookingId: result.booking.id });
}
