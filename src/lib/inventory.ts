import { randomUUID } from "node:crypto";
import type { AvailabilityResult, Booking, BookingStatus, CalendarDay, PaymentMethod } from "./types";
import { prisma } from "./db";
import { daysInMonth, nightsBetween, stayNights } from "./dates";
import { getRoomTypeById, ROOM_TYPES, stayTotalInr } from "./rooms";

export const HOLD_WINDOW_MINUTES = 15;

/** Statuses that hold a room for the night (pending holds are added separately). */
const OCCUPYING_STATUSES = ["confirmed", "checked_in", "blocked"];

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
  adminNote: string | null;
  userId: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  payments?: { id: string; amountInr: number; method: string; note: string | null; createdAt: string; createdBy: string | null }[];
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
    adminNote: row.adminNote ?? undefined,
    userId: row.userId ?? undefined,
    cancelReason: row.cancelReason ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
    payments: row.payments?.map((p) => ({
      id: p.id,
      amountInr: p.amountInr,
      method: p.method,
      note: p.note ?? undefined,
      createdAt: p.createdAt,
      createdBy: p.createdBy ?? undefined,
    })),
  };
}

let roomTypesReady: Promise<void> | null = null;

/** Makes sure every catalogue room exists in the DB. Runs once per server instance. */
export function ensureRoomTypes() {
  roomTypesReady ??= (async () => {
    const existing = await prisma.roomType.findMany({ select: { id: true } });
    const have = new Set(existing.map((row) => row.id));
    const missing = ROOM_TYPES.filter((room) => !have.has(room.id));
    if (missing.length === 0) return;
    await prisma.roomType.createMany({
      data: missing.map((room) => ({
        id: room.id,
        name: room.name,
        slug: room.slug,
        description: room.description,
        amenities: JSON.stringify(room.amenities),
        totalUnits: room.totalUnits,
        basePriceInr: room.basePriceInr,
        image: room.image,
      })),
      skipDuplicates: true,
    });
  })().catch((error) => {
    roomTypesReady = null;
    throw error;
  });
  return roomTypesReady;
}

async function managedRooms() {
  await ensureRoomTypes();
  const stored = await prisma.roomType.findMany({ orderBy: { id: "asc" } });
  return stored.flatMap((row) => {
    const catalog = getRoomTypeById(row.id);
    return catalog
      ? [{ ...catalog, name: row.name, description: row.description, totalUnits: row.totalUnits, basePriceInr: row.basePriceInr, image: row.image }]
      : [];
  });
}

export async function listPublicRooms() {
  return managedRooms();
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
          { status: { in: OCCUPYING_STATUSES } },
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
  const room = (await managedRooms()).find((item) => item.id === roomTypeId);
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
    ? (await managedRooms()).filter((r) => r.id === roomTypeId)
    : await managedRooms();
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
  /** Front-desk only: custom total and an internal note. */
  amountOverrideInr?: number;
  adminNote?: string;
  /** Front-desk only: a room block (out of order / owner use) rather than a guest. */
  block?: boolean;
}): Promise<{ ok: true; booking: Booking } | { ok: false; error: string }> {
  const room = (await managedRooms()).find((item) => item.id === input.roomTypeId);
  if (!room) return { ok: false, error: "Unknown room type" };

  const stay = stayNights(input.checkIn, input.checkOut);
  const nights = stay.length;
  if (nights < 1) return { ok: false, error: "Check-out must be after check-in" };
  if (input.guests > room.maxGuests) {
    return { ok: false, error: `This stay allows up to ${room.maxGuests} guests` };
  }
  const payAtHotel = input.paymentMethod === "at_hotel";
  const amountInr = input.block
    ? 0
    : input.amountOverrideInr !== undefined && input.amountOverrideInr >= 0
      ? Math.round(input.amountOverrideInr)
      : stayTotalInr(room, nights, input.guests);
  const depositInr = payAtHotel ? 0 : amountInr;

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
              { status: { in: OCCUPYING_STATUSES } },
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
          status: input.block ? "blocked" : payAtHotel ? "confirmed" : "pending",
          adminNote: input.adminNote?.trim().slice(0, 1000) || null,
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

const ADMIN_STATUSES = ["pending", "confirmed", "checked_in", "checked_out", "no_show", "cancelled", "expired"] as const;

export async function updateBookingStatus(bookingId: string, status: (typeof ADMIN_STATUSES)[number]) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false as const, error: "Booking not found" };
  if (booking.status === "expired" && status !== "cancelled") {
    return { ok: false as const, error: "Expired bookings cannot be reopened" };
  }
  if (booking.status === "checked_out" && status !== "cancelled") {
    return { ok: false as const, error: "Checked-out bookings cannot change status" };
  }
  const updated = await prisma.booking.update({ where: { id: bookingId }, data: { status } });
  return { ok: true as const, booking: toBooking(updated) };
}

export async function updateBookingNote(bookingId: string, adminNote: string) {
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { adminNote: adminNote.trim().slice(0, 1000) || null },
  });
  return toBooking(updated);
}

export async function getAdminDashboardMetrics(date: string) {
  await expireStaleHolds();
  const activeBookings = { notIn: ["cancelled", "expired"] };
  const [rooms, arrivals, departures, occupied, bookedRevenue, collectedRevenue] = await Promise.all([
    prisma.roomType.aggregate({ _sum: { totalUnits: true } }),
    prisma.booking.count({ where: { checkIn: date, status: activeBookings } }),
    prisma.booking.count({ where: { checkOut: date, status: activeBookings } }),
    prisma.bookingNight.count({ where: { night: date, booking: { status: { in: ["confirmed", "checked_in"] } } } }),
    prisma.booking.aggregate({ _sum: { amountInr: true }, where: { createdAt: { startsWith: date }, status: { notIn: ["cancelled", "expired"] } } }),
    prisma.booking.aggregate({ _sum: { amountInr: true }, where: { createdAt: { startsWith: date }, OR: [{ paymentMethod: "online", status: "confirmed" }, { paymentId: "paid_at_hotel" }] } }),
  ]);
  const totalUnits = rooms._sum.totalUnits ?? 0;
  return {
    date,
    arrivals,
    departures,
    occupied,
    totalUnits,
    occupancyPercent: totalUnits ? Math.round((occupied / totalUnits) * 100) : 0,
    bookedRevenue: bookedRevenue._sum.amountInr ?? 0,
    collectedRevenue: collectedRevenue._sum.amountInr ?? 0,
  };
}

export async function getAdminCalendar(month: string) {
  await expireStaleHolds();
  const dates = daysInMonth(month);
  const rows = await prisma.bookingNight.findMany({
    where: { night: { in: dates } },
    include: { booking: { include: { roomType: true } } },
    orderBy: { night: "asc" },
  });
  return rows.map((row) => ({
    night: row.night,
    booking: { ...toBooking(row.booking), roomName: row.booking.roomType.name },
  }));
}

export async function listAdminRooms() {
  await ensureRoomTypes();
  return prisma.roomType.findMany({ orderBy: { id: "asc" } });
}

export async function updateAdminRoom(input: {
  id: string;
  name?: string;
  description?: string;
  image?: string;
  basePriceInr?: number;
  totalUnits?: number;
}) {
  if (input.basePriceInr !== undefined && input.basePriceInr < 0) {
    return { ok: false as const, error: "Price cannot be negative" };
  }
  if (input.totalUnits !== undefined && input.totalUnits < 1) {
    return { ok: false as const, error: "A room must have at least one unit" };
  }
  try {
    const room = await prisma.roomType.update({
      where: { id: input.id },
      data: {
        name: input.name?.trim(),
        description: input.description?.trim(),
        image: input.image?.trim(),
        basePriceInr: input.basePriceInr,
        totalUnits: input.totalUnits,
      },
    });
    return { ok: true as const, room };
  } catch {
    return { ok: false as const, error: "Room not found" };
  }
}

export { ADMIN_STATUSES };

export async function createBookingRequest(input: {
  bookingId: string;
  userId: string;
  type: "cancellation" | "date_change";
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  note?: string;
}) {
  await expireStaleHolds();
  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, userId: input.userId },
  });
  if (!booking) return { ok: false as const, error: "Booking not found" };
  if (booking.status === "cancelled" || booking.status === "expired") {
    return { ok: false as const, error: "This booking is no longer active" };
  }

  const existing = await prisma.bookingRequest.findFirst({
    where: { bookingId: booking.id, status: "pending" },
  });
  if (existing) {
    return { ok: false as const, error: "A request is already awaiting review" };
  }

  if (input.type === "date_change") {
    if (!input.requestedCheckIn || !input.requestedCheckOut || input.requestedCheckIn >= input.requestedCheckOut) {
      return { ok: false as const, error: "Choose a valid new date range" };
    }
  }

  const request = await prisma.bookingRequest.create({
    data: {
      id: newId("rq"),
      bookingId: booking.id,
      type: input.type,
      requestedCheckIn: input.requestedCheckIn,
      requestedCheckOut: input.requestedCheckOut,
      note: input.note?.trim() || null,
      createdAt: new Date().toISOString(),
    },
  });
  return { ok: true as const, request };
}

export async function listBookingRequests() {
  const rows = await prisma.bookingRequest.findMany({
    include: { booking: { include: { roomType: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    ...row,
    booking: { ...toBooking(row.booking), roomName: row.booking.roomType.name },
  }));
}

export async function reviewBookingRequest(requestId: string, status: "approved" | "rejected") {
  const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false as const, error: "Request not found" };
  if (request.status !== "pending") return { ok: false as const, error: "Request already reviewed" };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: request.bookingId } });
      if (!booking || booking.status === "cancelled" || booking.status === "expired") {
        throw new Error("Booking is no longer active");
      }

      if (status === "approved" && request.type === "cancellation") {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "cancelled" },
        });
      }

      if (status === "approved" && request.type === "date_change") {
        if (!request.requestedCheckIn || !request.requestedCheckOut || request.requestedCheckIn >= request.requestedCheckOut) {
          throw new Error("Invalid requested dates");
        }
        const room = (await managedRooms()).find((item) => item.id === booking.roomTypeId);
        if (!room) throw new Error("Unknown room type");
        const requestedNights = stayNights(request.requestedCheckIn, request.requestedCheckOut);
        const occupied = await tx.bookingNight.findMany({
          where: {
            roomTypeId: room.id,
            night: { in: requestedNights },
            bookingId: { not: booking.id },
            booking: {
              OR: [
                { status: { in: OCCUPYING_STATUSES } },
                { AND: [{ status: "pending" }, { holdExpiresAt: { gt: new Date().toISOString() } }] },
              ],
            },
          },
          select: { night: true },
        });
        const occupiedByNight = new Map<string, number>();
        for (const row of occupied) {
          occupiedByNight.set(row.night, (occupiedByNight.get(row.night) ?? 0) + 1);
        }
        if (requestedNights.some((night) => (occupiedByNight.get(night) ?? 0) >= room.totalUnits)) {
          throw new Error("The requested dates are not available");
        }
        await tx.bookingNight.deleteMany({ where: { bookingId: booking.id } });
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            checkIn: request.requestedCheckIn,
            checkOut: request.requestedCheckOut,
            amountInr: stayTotalInr(room, requestedNights.length, booking.guests),
            depositInr: booking.paymentMethod === "at_hotel"
              ? 0
              : stayTotalInr(room, requestedNights.length, booking.guests),
          },
        });
        await tx.bookingNight.createMany({
          data: requestedNights.map((night) => ({
            id: newId("nt"), bookingId: booking.id, roomTypeId: room.id, night,
          })),
        });
      }

      return tx.bookingRequest.update({
        where: { id: request.id },
        data: { status, reviewedAt: new Date().toISOString() },
      });
    });
    return { ok: true as const, request: updated };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not review request" };
  }
}

/** Money already received for a booking, from the ledger (plus legacy flags). */
function paidSoFar(booking: { amountInr: number; depositInr: number; paymentId: string | null; paymentMethod: string }, payments: { amountInr: number }[]) {
  let paid = payments.reduce((n, p) => n + p.amountInr, 0);
  if (booking.paymentId?.startsWith("pay_")) paid += booking.depositInr || booking.amountInr;
  if (payments.length === 0 && booking.paymentId === "paid_at_hotel") paid = booking.amountInr;
  return paid;
}

const withPayments = { roomType: true, payments: { orderBy: { createdAt: "asc" as const } } };

async function syncPaidFlag(bookingId: string) {
  const row = await prisma.booking.findUnique({ where: { id: bookingId }, include: withPayments });
  if (!row) return null;
  if (!row.paymentId?.startsWith("pay_")) {
    const paid = paidSoFar(row, row.payments);
    const flag = paid >= row.amountInr && row.amountInr > 0 ? "paid_at_hotel" : "at_hotel";
    if (row.paymentId !== flag && row.payments.length > 0) {
      await prisma.booking.update({ where: { id: bookingId }, data: { paymentId: flag } });
      row.paymentId = flag;
    }
  }
  return { ...toBooking(row), roomName: row.roomType.name };
}

/** Front desk: take (or refund, with a negative amount) money against a booking. */
export async function addPayment(input: { bookingId: string; amountInr: number; method: string; note?: string; createdBy?: string }) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) return { ok: false as const, error: "Booking not found" };
  if (!input.amountInr) return { ok: false as const, error: "Enter an amount" };
  await prisma.payment.create({
    data: {
      id: newId("pm"),
      bookingId: booking.id,
      amountInr: Math.round(input.amountInr),
      method: input.method,
      note: input.note?.trim() || null,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy ?? null,
    },
  });
  if (booking.status === "pending" && input.amountInr > 0) {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "confirmed", holdExpiresAt: null } });
  }
  const updated = await syncPaidFlag(booking.id);
  return updated ? { ok: true as const, booking: updated } : { ok: false as const, error: "Booking not found" };
}

/** Front desk: settle whatever is still owed in one go. */
export async function markBookingPaid(bookingId: string, method = "cash", createdBy?: string) {
  await expireStaleHolds();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payments: true } });
  if (!booking) return { ok: false as const, error: "Booking not found" };
  if (booking.status === "cancelled" || booking.status === "expired") {
    return { ok: false as const, error: "Cannot mark this booking paid" };
  }
  const balance = booking.amountInr - paidSoFar(booking, booking.payments);
  if (balance > 0) {
    return addPayment({ bookingId, amountInr: balance, method, note: "Balance settled", createdBy });
  }
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: booking.status === "pending" ? "confirmed" : booking.status,
      paymentId: booking.paymentId?.startsWith("pay_") ? booking.paymentId : "paid_at_hotel",
    },
  });
  const updated = await syncPaidFlag(bookingId);
  return updated ? { ok: true as const, booking: updated } : { ok: false as const, error: "Booking not found" };
}

/** Front desk cancellation with a reason and an optional refund. */
export async function cancelBookingAdmin(input: { bookingId: string; reason?: string; refundInr?: number; refundMethod?: string; createdBy?: string }) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) return { ok: false as const, error: "Booking not found" };
  if (["cancelled", "expired", "checked_out"].includes(booking.status)) {
    return { ok: false as const, error: "This booking can't be cancelled" };
  }
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "cancelled", cancelReason: input.reason?.trim().slice(0, 300) || null, cancelledAt: new Date().toISOString() },
  });
  if (input.refundInr && input.refundInr > 0) {
    await prisma.payment.create({
      data: {
        id: newId("pm"),
        bookingId: booking.id,
        amountInr: -Math.round(input.refundInr),
        method: input.refundMethod || "cash",
        note: "Refund on cancellation",
        createdAt: new Date().toISOString(),
        createdBy: input.createdBy ?? null,
      },
    });
  }
  const updated = await syncPaidFlag(booking.id);
  return updated ? { ok: true as const, booking: updated } : { ok: false as const, error: "Booking not found" };
}

/** Bring a cancelled or no-show booking back, if its nights are still free. */
export async function reinstateBooking(bookingId: string) {
  await expireStaleHolds();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { roomType: true } });
  if (!booking) return { ok: false as const, error: "Booking not found" };
  if (!["cancelled", "no_show", "expired"].includes(booking.status)) {
    return { ok: false as const, error: "Only cancelled bookings can be reinstated" };
  }
  const nights = stayNights(booking.checkIn, booking.checkOut);
  const occupied = await prisma.bookingNight.findMany({
    where: {
      roomTypeId: booking.roomTypeId,
      night: { in: nights },
      bookingId: { not: booking.id },
      booking: {
        OR: [
          { status: { in: OCCUPYING_STATUSES } },
          { AND: [{ status: "pending" }, { holdExpiresAt: { gt: new Date().toISOString() } }] },
        ],
      },
    },
    select: { night: true },
  });
  const counts = new Map<string, number>();
  for (const row of occupied) counts.set(row.night, (counts.get(row.night) ?? 0) + 1);
  const full = nights.find((n) => (counts.get(n) ?? 0) >= booking.roomType.totalUnits);
  if (full) return { ok: false as const, error: `${booking.roomType.name} is now full on ${full}` };
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "confirmed", cancelReason: null, cancelledAt: null, holdExpiresAt: null },
  });
  const updated = await syncPaidFlag(booking.id);
  return updated ? { ok: true as const, booking: updated } : { ok: false as const, error: "Booking not found" };
}

/** One booking with its ledger, for the front-desk invoice. */
export async function getAdminBooking(bookingId: string) {
  const row = await prisma.booking.findUnique({ where: { id: bookingId }, include: withPayments });
  return row ? { ...toBooking(row), roomName: row.roomType.name } : null;
}

export async function listAdminBookings() {
  await expireStaleHolds();
  const rows = await prisma.booking.findMany({
    include: { roomType: true, payments: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    ...toBooking(row),
    roomName: row.roomType.name,
  }));
}

export async function listGuestBookings(input: { userId?: string; email?: string }) {
  await expireStaleHolds();
  // Only bookings made while signed in to this account. Matching on the
  // email alone would expose stays to anyone who registers that address,
  // since sign-up doesn't verify email yet.
  if (!input.userId) return [];
  const rows = await prisma.booking.findMany({
    where: { userId: input.userId },
    include: { roomType: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    ...toBooking(row),
    roomName: row.roomType.name,
  }));
}

export { nightsBetween };


/** Front desk: move a stay to new dates and/or another room type. */
export async function updateBookingStay(input: {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  roomTypeId?: string;
  guests?: number;
  repriceStay?: boolean;
}) {
  await expireStaleHolds();
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: input.bookingId } });
      if (!booking) throw new Error("Booking not found");
      if (["cancelled", "expired", "checked_out", "no_show"].includes(booking.status)) {
        throw new Error("This booking can no longer be changed");
      }
      const room = (await managedRooms()).find((item) => item.id === (input.roomTypeId || booking.roomTypeId));
      if (!room) throw new Error("Unknown room type");
      const nights = stayNights(input.checkIn, input.checkOut);
      if (nights.length < 1) throw new Error("Check-out must be after check-in");
      const guests = input.guests ?? booking.guests;
      if (booking.status !== "blocked" && guests > room.maxGuests) {
        throw new Error(`${room.name} allows up to ${room.maxGuests} guests`);
      }
      const occupied = await tx.bookingNight.findMany({
        where: {
          roomTypeId: room.id,
          night: { in: nights },
          bookingId: { not: booking.id },
          booking: {
            OR: [
              { status: { in: OCCUPYING_STATUSES } },
              { AND: [{ status: "pending" }, { holdExpiresAt: { gt: new Date().toISOString() } }] },
            ],
          },
        },
        select: { night: true },
      });
      const counts = new Map<string, number>();
      for (const row of occupied) counts.set(row.night, (counts.get(row.night) ?? 0) + 1);
      const full = nights.find((night) => (counts.get(night) ?? 0) >= room.totalUnits);
      if (full) throw new Error(`${room.name} is full on ${full}`);

      const amountInr = booking.status === "blocked"
        ? 0
        : input.repriceStay
          ? stayTotalInr(room, nights.length, guests)
          : booking.amountInr;
      await tx.bookingNight.deleteMany({ where: { bookingId: booking.id } });
      await tx.bookingNight.createMany({
        data: nights.map((night) => ({ id: newId("nt"), bookingId: booking.id, roomTypeId: room.id, night })),
      });
      return tx.booking.update({
        where: { id: booking.id },
        data: {
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          roomTypeId: room.id,
          guests,
          amountInr,
          depositInr: booking.paymentMethod === "online" ? amountInr : booking.depositInr,
        },
        include: { roomType: true },
      });
    });
    return { ok: true as const, booking: { ...toBooking(updated), roomName: updated.roomType.name } };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not change the stay" };
  }
}

/** Front desk: correct the guest's details or the agreed total. */
export async function updateBookingGuest(input: {
  bookingId: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  amountInr?: number;
}) {
  try {
    const updated = await prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        guestName: input.guestName?.trim() || undefined,
        guestEmail: input.guestEmail !== undefined ? input.guestEmail.trim().toLowerCase() : undefined,
        guestPhone: input.guestPhone !== undefined ? input.guestPhone.trim() : undefined,
        amountInr: input.amountInr !== undefined ? Math.max(0, Math.round(input.amountInr)) : undefined,
      },
      include: { roomType: true },
    });
    return { ok: true as const, booking: { ...toBooking(updated), roomName: updated.roomType.name } };
  } catch {
    return { ok: false as const, error: "Booking not found" };
  }
}
