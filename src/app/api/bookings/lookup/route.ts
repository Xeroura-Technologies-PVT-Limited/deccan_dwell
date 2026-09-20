import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookingByIdAndEmail } from "@/lib/inventory";

export const runtime = "nodejs";

const lookupSchema = z.object({
  bookingId: z.string().min(5).max(40),
  email: z.string().email(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = lookupSchema.safeParse({
    bookingId: searchParams.get("bookingId"),
    email: searchParams.get("email"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid booking ID and email address." },
      { status: 400 },
    );
  }

  const booking = await getBookingByIdAndEmail(
    parsed.data.bookingId,
    parsed.data.email,
  );
  if (!booking) {
    return NextResponse.json(
      { error: "We could not find a booking with those details." },
      { status: 404 },
    );
  }

  return NextResponse.json({ booking });
}