import type { Booking } from "@/lib/types";
import { addCalendarDays, stayNights, todayISO } from "@/lib/dates";

export type AdminBooking = Booking & { roomName: string };
export type AdminRoom = {
  id: string;
  name: string;
  slug: string;
  description: string;
  amenities: string;
  totalUnits: number;
  basePriceInr: number;
  image: string;
};
export type AdminRequest = {
  id: string;
  bookingId: string;
  type: "cancellation" | "date_change" | string;
  status: "pending" | "approved" | "rejected" | string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
  booking: AdminBooking;
};

export { addCalendarDays, stayNights, todayISO };

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const DAY = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const DAY_YEAR = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const fmtDay = (iso: string) => DAY.format(toDate(iso));
export const fmtDate = (iso: string) => DAY_YEAR.format(toDate(iso));
export const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const nightsOf = (b: Pick<Booking, "checkIn" | "checkOut">) => stayNights(b.checkIn, b.checkOut).length;

export function isBlock(b: Booking) {
  return b.status === "blocked";
}

/** Holds a room: confirmed, in house, blocked, or a live online hold. */
export function isLive(b: Booking, nowIso = new Date().toISOString()) {
  if (b.status === "confirmed" || b.status === "checked_in" || b.status === "blocked") return true;
  return b.status === "pending" && !!b.holdExpiresAt && b.holdExpiresAt > nowIso;
}

/** A real guest stay that counts for revenue and occupancy reporting. */
export function isSold(b: Booking) {
  return ["confirmed", "checked_in", "checked_out"].includes(b.status);
}

/** Money received so far: the front-desk ledger, plus online payments and legacy "paid" flags. */
export function paidAmount(b: Booking) {
  const ledger = b.payments ?? [];
  let paid = ledger.reduce((n, p) => n + p.amountInr, 0);
  if (b.paymentId?.startsWith("pay_")) paid += b.depositInr || b.amountInr;
  else if (b.paymentMethod === "online" && b.status !== "pending" && ledger.length === 0 && !b.paymentId) paid = b.amountInr;
  if (ledger.length === 0 && b.paymentId === "paid_at_hotel") paid = b.amountInr;
  return paid;
}

export function isPaid(b: Booking) {
  return b.amountInr > 0 && paidAmount(b) >= b.amountInr;
}

export function balanceDue(b: Booking) {
  if (isBlock(b) || !["confirmed", "checked_in", "checked_out"].includes(b.status)) return 0;
  return Math.max(0, b.amountInr - paidAmount(b));
}

/** Money held for a cancelled / no-show booking that hasn't been refunded. */
export function creditHeld(b: Booking) {
  if (!["cancelled", "no_show", "expired"].includes(b.status)) return 0;
  return Math.max(0, paidAmount(b));
}

export const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank transfer" },
] as const;
export const methodLabel = (m: string) => METHODS.find((x) => x.value === m)?.label ?? (m === "online" ? "Online" : "Other");

/** Ready-to-send WhatsApp confirmation for phone and walk-in guests. */
export function confirmationText(b: AdminBooking) {
  const due = balanceDue(b);
  const lines = [
    `Hello ${b.guestName.split(/\s+/)[0]}, your stay at Deccan Dwell is confirmed.`,
    ``,
    `Booking no.: ${b.id.toUpperCase()}`,
    `Room: ${b.roomName} · ${b.guests} guest${b.guests > 1 ? "s" : ""}`,
    `Check-in: ${fmtDate(b.checkIn)} from 12:00 pm`,
    `Check-out: ${fmtDate(b.checkOut)} by 11:30 am`,
    `Total: ${rupees(b.amountInr)}${due > 0 ? ` · ${rupees(due)} payable at check-in` : " · fully paid"}`,
    ``,
    `Deccan Dwell, Chamundi Hills Main Road, JC Nagar, Mysuru`,
    `https://maps.google.com/?q=Deccan+Dwell+Mysuru`,
    `Questions? Call +91 9945 465 380.`,
  ];
  return lines.join("\n");
}

export function sourceOf(b: Booking) {
  const m = b.adminNote?.match(/^Source:\s*(.+)$/m);
  if (m) return m[1].trim();
  return b.paymentMethod === "online" || b.userId || b.guestEmail ? "Website" : "Front desk";
}

/** The note without the machine-written "Source:" line. */
export function noteText(b: Booking) {
  return (b.adminNote ?? "").replace(/^Source:.*$/m, "").trim();
}

export const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "On hold", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  confirmed: { label: "Confirmed", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  checked_in: { label: "In house", tone: "bg-[#0b3d33] text-white ring-[#0b3d33]" },
  checked_out: { label: "Checked out", tone: "bg-stone-100 text-stone-700 ring-stone-200" },
  no_show: { label: "No-show", tone: "bg-orange-50 text-orange-800 ring-orange-200" },
  cancelled: { label: "Cancelled", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  expired: { label: "Expired", tone: "bg-stone-100 text-stone-500 ring-stone-200" },
  blocked: { label: "Blocked", tone: "bg-stone-200 text-stone-700 ring-stone-300" },
};

/** Bar colours on the calendar. */
export const BAR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  confirmed: "bg-emerald-100 text-emerald-950 border-emerald-300",
  checked_in: "bg-[#0b3d33] text-white border-[#0b3d33]",
  checked_out: "bg-stone-200 text-stone-700 border-stone-300",
  blocked: "dda-hatch text-stone-700 border-stone-400",
};

export function csv(rows: (string | number)[][]) {
  return rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const blob = new Blob([csv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function whatsappHref(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const base = `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
