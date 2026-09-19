import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailability, getMonthAvailability } from "@/lib/inventory";

export const runtime = "nodejs";

const rangeSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomTypeId: z.string().optional(),
});

const monthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  roomTypeId: z.string(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const roomTypeId = searchParams.get("roomTypeId") ?? undefined;

  if (month) {
    const parsed = monthSchema.safeParse({ month, roomTypeId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide month=YYYY-MM and roomTypeId" },
        { status: 400 },
      );
    }
    const result = await getMonthAvailability(parsed.data.roomTypeId, parsed.data.month);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const parsed = rangeSchema.safeParse({
    checkIn: searchParams.get("checkIn"),
    checkOut: searchParams.get("checkOut"),
    roomTypeId,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide checkIn and checkOut as YYYY-MM-DD, or month=YYYY-MM" },
      { status: 400 },
    );
  }

  const { checkIn, checkOut } = parsed.data;
  if (checkIn >= checkOut) {
    return NextResponse.json(
      { error: "checkOut must be after checkIn" },
      { status: 400 },
    );
  }

  const availability = await getAvailability(checkIn, checkOut, parsed.data.roomTypeId);
  return NextResponse.json({ checkIn, checkOut, availability });
}
