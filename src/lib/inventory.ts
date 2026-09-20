import { randomUUID } from "node:crypto";
import type { AvailabilityResult, Booking, BookingStatus, CalendarDay, PaymentMethod } from "./types";
import { prisma } from "./db";
import { daysInMonth, nightsBetween, stayNights } from "./dates";
import { getRoomTypeById, ROOM_TYPES, stayTotalInr } from "./rooms";

export const HOLD_WINDOW_MINUTES = 15;

function newId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function toBooking(row: {
  id: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  status: string;
  amountInr: number;
  depositInr: number;
  paymentId: string | null;
  paymentMethod: string;
  razorpayOrderId: string | null;
  holdExpiresAt: string | null;
  createdAt: string;
  userId: string | null;
}): Booking {
  return {
    id: row.id,
    roomTypeId: row.roomTypeId,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    guests: row.guests,
    guestName: row.guestName,
    guestEmail: row.guestEmail,
    guestPhone: row.guestPhone,
    status: row.status as BookingStatus,
    amountInr: row.amountInr,
    depositInr: row.depositInr,
    paymentId: row.paymentId ?? undefined,
    paymentMethod: (row.paymentMethod as PaymentMethod) || "online",
    razorpayOrderId: row.razorpayOrderId ?? undefined,
    holdExpiresAt: row.holdExpiresAt ?? undefined,
    createdAt: row.createdAt,
    userId: row.userId ?? undefined,
  };
}

export async function ensureRoomTypes() {
  for (const room of ROOM_TYPES) {
    await prisma.roomType.upsert({
      where: { id: room.id },
      create: {
        id: room.id,
        name: room.name,
        slug: room.slug,
        description: room.description,
        amenities: JSON.stringify(room.amenities),
        totalUnits: room.totalUnits,
        basePriceInr: room.basePriceInr,
        image: room.image,
      },
      update: {
        name: room.name,
        slug: room.slug,
        description: room.description,
        amenities: JSON.stringify(room.amenities),
        totalUnits: room.totalUnits,
        basePriceInr: room.basePriceInr,
        image: room.image,
      },
    });
  }
}

export async function expireStaleHolds(now = new Date()) {
  const nowIso = now.toISOString();
  await prisma.booking.updateMany({
    where: {
      status: "pending",
      holdExpiresAt: { lte: nowIso },
    },
    data: { status: "expired" },
  });
}

async function nightCounts(
  roomTypeId: string,
  nights: string[],
  nowIso: string,
) {
  if (nights.length === 0) return new Map<string, number>();
  const rows = await prisma.bookingNight.findMany({
    where: {
      roomTypeId,
      night: { in: nights },
      booking: {
        OR: [
          { status: "confirmed" },
          { AND: [{ status: "pending" }, { holdExpiresAt: { gt: nowIso } }] },
        ],
      },
    },
    select: { night: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.night, (counts.get(row.night) ?? 0) + 1);
  }
  return counts;
}

function calendarFromCounts(
  nights: string[],
  totalUnits: number,
  counts: Map<string, number>,
): CalendarDay[] {
  return nights.map((date) => {
    const booked = counts.get(date) ?? 0;
    const remaining = Math.max(0, totalUnits - booked);
    return {
      date,
      booked,
      remaining,
      total: totalUnits,
      soldOut: remaining === 0,
    };
  });
}

export async function getMonthAvailability(
  roomTypeId: string,
  month: string,
): Promise<{ roomTypeId: string; totalUnits: number; days: CalendarDay[] } | { error: string }> {
  const room = getRoomTypeById(roomTypeId);
  if (!room) return { error: "Unknown room type" };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "month must be YYYY-MM" };

  await ensureRoomTypes();
  await expireStaleHolds();

  const nights = daysInMonth(month);
  const counts = await nightCounts(room.id, nights, new Date().toISOString());
  return {
    roomTypeId: room.id,
    totalUnits: room.totalUnits,
    days: calendarFromCounts(nights, room.totalUnits, counts),
  };
}

export async function getAvailability(
  checkIn: string,
  checkOut: string,
  roomTypeId?: string,
): Promise<AvailabilityResult[]> {
  await ensureRoomTypes();
  await expireStaleHolds();

  const stay = stayNights(checkIn, checkOut);
  const nights = stay.length;
  const types = roomTypeId
    ? ROOM_TYPES.filter((r) => r.id === roomTypeId)
    : ROOM_TYPES;
  const nowIso = new Date().toISOString();

  const results: AvailabilityResult[] = [];
  for (const room of types) {
    const counts = await nightCounts(room.id, stay, nowIso);
    const calendar = calendarFromCounts(stay, room.totalUnits, counts);
    const bottleneck = calendar.reduce(
      (min, day) => Math.min(min, day.remaining),
      room.totalUnits,
    );
    const peakBooked = calendar.reduce((max, day) => Math.max(max, day.booked), 0);
    results.push({
      roomTypeId: room.id,
      name: room.name,
      slug: room.slug,
      totalUnits: room.totalUnits,
      bookedUnits: peakBooked,
      availableUnits: nights === 0 ? 0 : bottleneck,
      soldOut: nights === 0 || bottleneck === 0,
      basePriceInr: room.basePriceInr,
      nights,
      totalPriceInr: room.basePriceInr * nights,
      calendar,
    });
  }
  return results;
}

export async function createPendingBooking(input: {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  paymentMethod?: PaymentMethod;
  userId?: string;
}): Promise<{ ok: true; booking: Booking } | { ok: false; error: string }> {
  const room = getRoomTypeById(input.roomTypeId);
  if (!room) return { ok: false, error: "Unknown room type" };

  const stay = stayNights(input.checkIn, input.checkOut);
  const nights = stay.length;
  if (nights < 1) return { ok: false, error: "Check-out must be after check-in" };
  if (input.guests > room.maxGuests) {
    return { ok: false, error: `This stay allows up to ${room.maxGuests} guests` };
  }
  const payAtHotel = input.paymentMethod === "at_hotel";
  const amountInr = stayTotalInr(room, nights, input.guests);
  const depositInr = payAtHotel ? 0 : amountInr;

  await ensureRoomTypes();

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const nowIso = now.toISOString();
      await tx.booking.updateMany({
        where: {
          status: "pending",
          holdExpiresAt: { lte: nowIso },
        },
        data: { status: "expired" },
      });

      const rows = await tx.bookingNight.findMany({
        where: {
          roomTypeId: room.id,
          night: { in: stay },
          booking: {
            OR: [
              { status: "confirmed" },
              { AND: [{ status: "pending" }, { holdExpiresAt: { gt: nowIso } }] },
            ],
          },
        },
        select: { night: true },
      });
      const counts = new Map<string, number>();
      for (const row of rows) {
        counts.set(row.night, (counts.get(row.night) ?? 0) + 1);
      }
      for (const night of stay) {
        if ((counts.get(night) ?? 0) >= room.totalUnits) {
          throw new Error("Sold out for selected dates");
        }
      }

      const id = newId("bk");
      const created = await tx.booking.create({
        data: {
          id,
          roomTypeId: room.id,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          guests: input.guests,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          guestEmail: input.guestEmail.trim().toLowerCase(),
          userId: input.userId || null,
          status: payAtHotel ? "confirmed" : "pending",
          amountInr,
          depositInr,
          paymentMethod: payAtHotel ? "at_hotel" : "online",
          paymentId: payAtHotel ? "at_hotel" : null,
          holdExpiresAt: payAtHotel
            ? null
            : new Date(now.getTime() + HOLD_WINDOW_MINUTES * 60 * 1000).toISOString(),
          createdAt: nowIso,
          nights: {
            create: stay.map((night) => ({
              id: newId("nt"),
              roomTypeId: room.id,
              night,
            })),
          },
        },
      });
      return created;
    });

    return { ok: true, booking: toBooking(booking) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not hold room";
    return { ok: false, error: message };
  }
}

export async function attachRazorpayOrder(bookingId: string, orderId: string) {
  const row = await prisma.booking.update({
    where: { id: bookingId },
    data: { razorpayOrderId: orderId },
  });
  return toBooking(row);
}

export async function getBookingById(bookingId: string) {
  await expireStaleHolds();
  const row = await prisma.booking.findUnique({ where: { id: bookingId } });
  return row ? toBooking(row) : null;
}

export async function getBookingByIdAndEmail(bookingId: string, email: string) {
  await expireStaleHolds();
  const row = await prisma.booking.findFirst({
    where: {
      id: bookingId.trim(),
      guestEmail: email.trim().toLowerCase(),
    },
    include: { roomType: true },
  });
  return row ? { ...toBooking(row), roomName: row.roomType.name } : null;
}

export async function getBookingByOrderId(orderId: string) {
  await expireStaleHolds();
  const row = await prisma.booking.findUnique({
    where: { razorpayOrderId: orderId },
  });
  return row ? toBooking(row) : null;
}

export async function confirmBooking(
  bookingId: string,
  paymentId: string,
): Promise<{ ok: true; booking: Booking } | { ok: false; error: string }> {
  await expireStaleHolds();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.status === "confirmed" && booking.paymentId === paymentId) {
    return { ok: true, booking: toBooking(booking) };
  }
  if (booking.status === "expired") {
    return { ok: false, error: "Hold expired — please book again" };
  }
  if (booking.status !== "pending") {
    return { ok: false, error: `Cannot confirm status ${booking.status}` };
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "confirmed", paymentId, paymentMethod: "online" },
  });
  return { ok: true, booking: toBooking(updated) };
}

export async function cancelBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false as const, error: "Booking not found" };
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
  });
  return { ok: true as const, booking: toBooking(updated) };
}

export async function markBookingPaid(bookingId: string) {
  await expireStaleHolds();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false as const, error: "Booking not found" };
  if (booking.status === "cancelled" || booking.status === "expired") {
    return { ok: false as const, error: "Cannot mark this booking paid" };
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "confirmed",
      paymentId: booking.paymentId?.startsWith("pay_")
        ? booking.paymentId
        : "paid_at_hotel",
    },
  });
  return { ok: true as const, booking: toBooking(updated) };
}

export async function listAdminBookings() {
  await expireStaleHolds();
  const rows = await prisma.booking.findMany({
    include: { roomType: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    ...toBooking(row),
    roomName: row.roomType.name,
  }));
}

export async function listGuestBookings(input: { userId?: string; email?: string }) {
  await expireStaleHolds();
  const email = input.email?.trim().toLowerCase();
  if (!input.userId && !email) return [];
  const rows = await prisma.booking.findMany({
    where: {
      OR: [
        input.userId ? { userId: input.userId } : undefined,
        email ? { guestEmail: email } : undefined,
      ].filter(Boolean) as { userId?: string; guestEmail?: string }[],
    },
    include: { roomType: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    ...toBooking(row),
    roomName: row.roomType.name,
  }));
}

export { nightsBetween };
