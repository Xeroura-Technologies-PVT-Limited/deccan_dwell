import { addCalendarDays, isBlock, isLive, isSold, nightsOf, type AdminBooking, type AdminRoom } from "./lib";

/** Units held per room type per night (live bookings + blocks). */
export function occupancyMap(bookings: AdminBooking[], from: string, days: number) {
  const nowIso = new Date().toISOString();
  const end = addCalendarDays(from, days);
  const map = new Map<string, { guests: number; blocked: number }>();
  for (const b of bookings) {
    if (!isLive(b, nowIso) && b.status !== "checked_out") continue;
    if (b.checkOut <= from || b.checkIn >= end) continue;
    for (let d = b.checkIn < from ? from : b.checkIn; d < b.checkOut && d < end; d = addCalendarDays(d, 1)) {
      const key = d;
      const cur = map.get(key) ?? { guests: 0, blocked: 0 };
      if (isBlock(b)) cur.blocked += 1;
      else if (b.status !== "checked_out" || d < b.checkOut) cur.guests += 1;
      map.set(key, cur);
    }
  }
  return map;
}

export function totalUnits(rooms: AdminRoom[]) {
  return rooms.reduce((n, r) => n + r.totalUnits, 0);
}

/** Room revenue and nights sold that fall inside [from, to). Revenue is spread evenly across a stay's nights. */
export function periodStats(bookings: AdminBooking[], rooms: AdminRoom[], from: string, to: string) {
  let revenue = 0;
  let nightsSold = 0;
  let blockedNights = 0;
  const byRoom = new Map<string, { revenue: number; nights: number; stays: number }>();
  const bySource = new Map<string, number>();
  const perDay = new Map<string, number>();
  let stays = 0;
  let cancelled = 0;
  let noShows = 0;
  let leadDays = 0;
  let lengthSum = 0;

  for (const b of bookings) {
    const overlaps = b.checkOut > from && b.checkIn < to;
    if (!overlaps) continue;
    if (b.status === "cancelled") cancelled += 1;
    if (b.status === "no_show") noShows += 1;
    const n = nightsOf(b) || 1;
    if (isBlock(b)) {
      for (let d = b.checkIn; d < b.checkOut; d = addCalendarDays(d, 1)) if (d >= from && d < to) blockedNights += 1;
      continue;
    }
    if (!isSold(b)) continue;
    stays += 1;
    lengthSum += n;
    leadDays += Math.max(0, Math.round((Date.parse(`${b.checkIn}T00:00:00Z`) - Date.parse(b.createdAt)) / 86_400_000));
    const nightly = b.amountInr / n;
    const room = byRoom.get(b.roomTypeId) ?? { revenue: 0, nights: 0, stays: 0 };
    room.stays += 1;
    for (let d = b.checkIn; d < b.checkOut; d = addCalendarDays(d, 1)) {
      if (d < from || d >= to) continue;
      revenue += nightly;
      nightsSold += 1;
      room.revenue += nightly;
      room.nights += 1;
      perDay.set(d, (perDay.get(d) ?? 0) + 1);
    }
    byRoom.set(b.roomTypeId, room);
    const src = sourceFromNote(b);
    bySource.set(src, (bySource.get(src) ?? 0) + 1);
  }

  const days = Math.max(1, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000));
  const capacity = Math.max(1, totalUnits(rooms) * days - blockedNights);
  return {
    days,
    revenue,
    nightsSold,
    capacity,
    occupancy: nightsSold / capacity,
    adr: nightsSold ? revenue / nightsSold : 0,
    revpar: revenue / capacity,
    stays,
    cancelled,
    noShows,
    avgLength: stays ? lengthSum / stays : 0,
    avgLead: stays ? leadDays / stays : 0,
    byRoom,
    bySource,
    perDay,
  };
}

function sourceFromNote(b: AdminBooking) {
  const m = b.adminNote?.match(/^Source:\s*(.+)$/m);
  return m ? m[1].trim() : "Website";
}

const istDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso));

/** Money actually received (or refunded) in [from, to), by method, from the ledger and online payments. */
export function collections(bookings: AdminBooking[], from: string, to: string) {
  const byMethod = new Map<string, number>();
  let received = 0;
  let refunded = 0;
  const add = (method: string, amount: number) => {
    if (amount >= 0) {
      received += amount;
      byMethod.set(method, (byMethod.get(method) ?? 0) + amount);
    } else refunded += -amount;
  };
  for (const b of bookings) {
    if (b.paymentId?.startsWith("pay_")) {
      const d = istDay(b.createdAt);
      if (d >= from && d < to) add("online", b.depositInr || b.amountInr);
    }
    for (const p of b.payments ?? []) {
      const d = istDay(p.createdAt);
      if (d >= from && d < to) add(p.method, p.amountInr);
    }
  }
  return { byMethod, received, refunded, net: received - refunded };
}
