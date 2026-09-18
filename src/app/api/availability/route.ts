import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailability } from "@/lib/inventory";

const querySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomTypeId: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    checkIn: searchParams.get("checkIn"),
    checkOut: searchParams.get("checkOut"),
    roomTypeId: searchParams.get("roomTypeId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide checkIn and checkOut as YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const { checkIn, checkOut, roomTypeId } = parsed.data;
  if (checkIn >= checkOut) {
    return NextResponse.json(
      { error: "checkOut must be after checkIn" },
      { status: 400 },
    );
  }

  const availability = getAvailability(checkIn, checkOut, roomTypeId);
  return NextResponse.json({ checkIn, checkOut, availability });
}
