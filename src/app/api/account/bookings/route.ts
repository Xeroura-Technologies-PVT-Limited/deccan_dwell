import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listGuestBookings } from "@/lib/inventory";

export const runtime = "nodejs";

async function handleGET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookings = await listGuestBookings({
    userId: session.id,
    email: session.email,
  });
  return NextResponse.json({ bookings });
}

// Every handler answers in JSON, even when something unexpected fails.
export async function GET(...args: Parameters<typeof handleGET>) {
  try {
    return await handleGET(...args);
  } catch (error) {
    return apiError(error);
  }
}
