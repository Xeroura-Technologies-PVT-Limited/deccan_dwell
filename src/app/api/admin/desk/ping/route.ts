import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Cheap "anything new?" check for the front desk, polled every 20 seconds
 * while reception keeps the desk open. It returns a few bytes instead of the
 * full booking list, so the desk only downloads everything when a new
 * website booking or guest request has actually arrived.
 *
 * "Website" matches the desk's own rule (lib.ts sourceOf): bookings the desk
 * creates carry a "Source: …" line in adminNote; blocks and expired holds
 * never ring the bell.
 */
async function handleGET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new URL(request.url).searchParams.get("since") ?? "";
  // createdAt is stored as an ISO string, so string comparison is time order.
  if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(since)) {
    return NextResponse.json({ error: "since must be an ISO timestamp" }, { status: 400 });
  }

  const websiteBookings = {
    createdAt: { gt: since },
    status: { notIn: ["blocked", "expired"] },
    OR: [{ adminNote: null }, { NOT: { adminNote: { contains: "Source:" } } }],
  };
  const pendingRequests = { createdAt: { gt: since }, status: "pending" };

  const [b, r] = await Promise.all([
    prisma.booking.aggregate({ where: websiteBookings, _count: { _all: true }, _max: { createdAt: true } }),
    prisma.bookingRequest.aggregate({ where: pendingRequests, _count: { _all: true }, _max: { createdAt: true } }),
  ]);

  const bookings = b._count._all;
  const requests = r._count._all;
  const latest = [b._max.createdAt, r._max.createdAt].filter((x): x is string => Boolean(x)).sort().pop() ?? null;

  return NextResponse.json(
    { hasNew: bookings + requests > 0, bookings, requests, latest },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(...args: Parameters<typeof handleGET>) {
  try {
    return await handleGET(...args);
  } catch (error) {
    return apiError(error);
  }
}
