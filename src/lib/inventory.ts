import { addDays, eachDayOfInterval, formatISO, isBefore, parseISO } from "date-fns";
import type { AvailabilityResult, Booking, RoomType } from "./types";

/**
 * Free local inventory store.
 * Swap this module for Supabase/Postgres later — same function signatures.
 *
 * Schema equivalent:
 *   room_types(id, name, slug, total_units, base_price_inr, ...)
 *   bookings(id, room_type_id, check_in, check_out, status, hold_expires_at, payment_id, ...)
 */

export const ROOM_TYPES: RoomType[] = [
  {
    id: "rt_deluxe",
    name: "Deluxe Room",
    slug: "deluxe",
    description:
      "Spacious stays with modern comforts — soft linens, garden light, and a calm Mysuru retreat.",
    amenities: ["King bed", "Garden view", "Ensuite", "Breakfast", "AC", "Wi‑Fi"],
    totalUnits: 4,
    basePriceInr: 4500,
    image: "/images/room-deluxe.jpg",
  },
  {
    id: "rt_suite",
    name: "Heritage Suite",
    slug: "suite",
    description:
      "At the foothills of Chamundi Hills — a generous suite for longer stays and quiet evenings.",
    amenities: ["Living area", "Hill view", "Bathtub", "Breakfast", "AC", "Wi‑Fi"],
    totalUnits: 2,
    basePriceInr: 7500,
    image: "/images/room-suite.jpg",
  },
];

/** In-memory bookings. Replace with DB in production. */
const bookings: Booking[] = [];

const HOLD_MINUTES = 15;

function nightsBetween(checkIn: string, checkOut: string) {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  if (!isBefore(start, end)) return 0;
  return eachDayOfInterval({ start, end: addDays(end, -1) }).length;
}

function rangesOverlap(
  aIn: string,
  aOut: string,
  bIn: string,
  bOut: string,
) {
  // [checkIn, checkOut) half-open intervals
  return aIn < bOut && bIn < aOut;
}

function isActiveBooking(b: Booking, now = new Date()) {
  if (b.status === "confirmed") return true;
  if (b.status === "pending" && b.holdExpiresAt) {
    return parseISO(b.holdExpiresAt) > now;
  }
  return false;
}

function expireStaleHolds(now = new Date()) {
  for (const b of bookings) {
    if (
      b.status === "pending" &&
      b.holdExpiresAt &&
      parseISO(b.holdExpiresAt) <= now
    ) {
      b.status = "expired";
    }
  }
}

export function getRoomTypes() {
  return ROOM_TYPES;
}

export function getRoomTypeById(id: string) {
  return ROOM_TYPES.find((r) => r.id === id);
}

export function getRoomTypeBySlug(slug: string) {
  return ROOM_TYPES.find((r) => r.slug === slug);
}

/** Peak concurrent units booked for overlapping stay (conservative / simple). */
export function countBookedUnits(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
) {
  expireStaleHolds();
  return bookings.filter(
    (b) =>
      b.roomTypeId === roomTypeId &&
      isActiveBooking(b) &&
      rangesOverlap(b.checkIn, b.checkOut, checkIn, checkOut),
  ).length;
}

export function getAvailability(
  checkIn: string,
  checkOut: string,
  roomTypeId?: string,
): AvailabilityResult[] {
  const nights = nightsBetween(checkIn, checkOut);
  const types = roomTypeId
    ? ROOM_TYPES.filter((r) => r.id === roomTypeId)
    : ROOM_TYPES;

  return types.map((room) => {
    const bookedUnits = countBookedUnits(room.id, checkIn, checkOut);
    const availableUnits = Math.max(0, room.totalUnits - bookedUnits);
    return {
      roomTypeId: room.id,
      name: room.name,
      slug: room.slug,
      totalUnits: room.totalUnits,
      bookedUnits,
      availableUnits,
      soldOut: availableUnits === 0,
      basePriceInr: room.basePriceInr,
      nights,
      totalPriceInr: room.basePriceInr * nights,
    };
  });
}

export function createPendingBooking(input: {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
}): { ok: true; booking: Booking } | { ok: false; error: string } {
  const room = getRoomTypeById(input.roomTypeId);
  if (!room) return { ok: false, error: "Unknown room type" };

  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) return { ok: false, error: "Check-out must be after check-in" };

  const available = getAvailability(
    input.checkIn,
    input.checkOut,
    input.roomTypeId,
  )[0];

  if (!available || available.soldOut) {
    return { ok: false, error: "Sold out for selected dates" };
  }

  const now = new Date();
  const booking: Booking = {
    id: `bk_${crypto.randomUUID().slice(0, 8)}`,
    roomTypeId: input.roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    status: "pending",
    amountInr: available.totalPriceInr,
    holdExpiresAt: new Date(
      now.getTime() + HOLD_MINUTES * 60 * 1000,
    ).toISOString(),
    createdAt: formatISO(now),
  };

  bookings.push(booking);
  return { ok: true, booking };
}

export function confirmBooking(bookingId: string, paymentId: string) {
  expireStaleHolds();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return { ok: false as const, error: "Booking not found" };
  if (booking.status === "expired") {
    return { ok: false as const, error: "Hold expired — please book again" };
  }
  if (booking.status !== "pending") {
    return { ok: false as const, error: `Cannot confirm status ${booking.status}` };
  }
  booking.status = "confirmed";
  booking.paymentId = paymentId;
  return { ok: true as const, booking };
}

export function cancelBooking(bookingId: string) {
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return { ok: false as const, error: "Booking not found" };
  booking.status = "cancelled";
  return { ok: true as const, booking };
}

export function listBookings() {
  expireStaleHolds();
  return [...bookings];
}

export const HOLD_WINDOW_MINUTES = HOLD_MINUTES;
