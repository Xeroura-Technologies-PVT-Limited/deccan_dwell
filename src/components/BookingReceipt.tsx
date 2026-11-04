"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { CHECK_IN_TIME, CHECK_OUT_TIME, HOTEL } from "@/lib/hotel";

type ReceiptBooking = {
  id: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  status: string;
  amountInr: number;
  paymentMethod?: string;
  paymentId?: string;
  createdAt?: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;
/** Paper feed: the thermal head pulls the slip out in short jerks, then it is torn off. */
const FEED_START = 0.9;
const FEED_DURATION = 2.6;
const TEAR_AT = FEED_START + FEED_DURATION + 0.15;
const STAMP_AT = TEAR_AT + 0.55;
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Deccan Dwell, ${HOTEL.address}`)}`;

function rupees(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function paymentLabel(b: ReceiptBooking) {
  if (b.paymentId === "paid_at_hotel") return "Paid at hotel";
  if (b.paymentMethod === "at_hotel") return "Due at check-in";
  if (b.paymentMethod === "online" && b.status !== "pending") return "Paid online";
  return "Awaiting payment";
}

const STATUS_COPY: Record<string, { stamp: string; eyebrow: string; tone: "gold" | "muted" | "alert" }> = {
  confirmed: { stamp: "Confirmed", eyebrow: "Reservation confirmed", tone: "gold" },
  checked_in: { stamp: "Checked in", eyebrow: "Welcome to Deccan Dwell", tone: "gold" },
  checked_out: { stamp: "Thank you", eyebrow: "Stay complete", tone: "gold" },
  pending: { stamp: "On hold", eyebrow: "Awaiting payment", tone: "muted" },
  cancelled: { stamp: "Cancelled", eyebrow: "Booking cancelled", tone: "alert" },
  expired: { stamp: "Expired", eyebrow: "Hold expired", tone: "alert" },
};

/** Deterministic barcode bars from the booking id. */
function barcode(id: string) {
  const bars: number[] = [];
  for (const ch of id.replace(/[^a-z0-9]/gi, "")) {
    const c = ch.charCodeAt(0);
    bars.push(1 + (c % 3), 1 + ((c >> 2) % 2), 1 + ((c >> 1) % 3), 1);
  }
  return bars;
}

function icsHref(b: ReceiptBooking) {
  const d = (iso: string) => iso.replace(/-/g, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deccan Dwell//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.id}@deccandwell`,
    `DTSTART;VALUE=DATE:${d(b.checkIn)}`,
    `DTEND;VALUE=DATE:${d(b.checkOut)}`,
    `SUMMARY:Stay at Deccan Dwell · ${b.roomName}`,
    `LOCATION:${HOTEL.address.replace(/,/g, "\\,")}`,
    `DESCRIPTION:Booking ${b.id}. Check-in ${CHECK_IN_TIME}\\, check-out ${CHECK_OUT_TIME}.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? "text-[15px] font-semibold" : ""}`}>
      <span className="text-[#13302a]/60">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function BookingReceipt({ booking }: { booking: ReceiptBooking }) {
  const still = useReducedMotion() ?? false;
  const nights = Math.max(1, differenceInCalendarDays(parseISO(booking.checkOut), parseISO(booking.checkIn)));
  const copy = STATUS_COPY[booking.status] ?? STATUS_COPY.confirmed;
  const firstName = booking.guestName.trim().split(/\s+/)[0] || "there";
  const inDate = format(parseISO(booking.checkIn), "EEE d MMM yyyy");
  const issued = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).replace(",", " ·")
    : "—";
  const live = booking.status !== "cancelled" && booking.status !== "expired";
  const due = booking.paymentMethod === "at_hotel" && booking.paymentId !== "paid_at_hotel";

  // Feed keyframes: short pulls with tiny pauses, like a thermal printer.
  const feedY = ["-100%", "-84%", "-83%", "-64%", "-63%", "-44%", "-43%", "-22%", "-21%", "0%"];
  const feedTimes = [0, 0.12, 0.2, 0.33, 0.41, 0.55, 0.63, 0.77, 0.85, 1];

  const rise = (i: number) => ({
    initial: still ? false : { opacity: 0, y: 26, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 1.1, ease: EASE, delay: 0.15 + i * 0.12 },
  });

  return (
    <div className="relative grid items-start gap-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20">
      {/* ——— Left: the welcome ——— */}
      <div className="dd-ticket-copy order-2 lg:order-1 lg:pt-10">
        <motion.p className="dd-eyebrow" {...rise(0)}>{copy.eyebrow}</motion.p>
        <motion.h1
          {...rise(1)}
          className="mt-6 font-[family-name:var(--font-display)] text-[clamp(44px,6vw,84px)] font-light leading-[0.98] tracking-[-0.01em] text-[var(--dd-cream)]"
        >
          {live ? (
            <>We&rsquo;ll see you in <em className="italic text-[var(--dd-gold)]">Mysuru</em>, {firstName}.</>
          ) : (
            <>This booking is <em className="italic text-[var(--dd-gold)]">{copy.stamp.toLowerCase()}</em>.</>
          )}
        </motion.h1>
        <motion.p {...rise(2)} className="mt-7 max-w-xl text-[17px] leading-relaxed text-[var(--dd-cream)]/70">
          {live ? (
            <>
              Your <span className="text-[var(--dd-cream)]">{booking.roomName}</span> is reserved for{" "}
              {nights} {nights === 1 ? "night" : "nights"}, {format(parseISO(booking.checkIn), "d MMM")} –{" "}
              {format(parseISO(booking.checkOut), "d MMM yyyy")}. Your receipt is printing alongside. Keep it handy for check-in.
            </>
          ) : (
            <>If this wasn&rsquo;t expected, call us on {HOTEL.phones[0].label} and we&rsquo;ll sort it out.</>
          )}
        </motion.p>

        {live && (
          <motion.ol {...rise(3)} className="mt-12 grid gap-px overflow-hidden border border-[var(--dd-line-dark)] bg-[var(--dd-line-dark)] sm:grid-cols-3">
            {[
              { k: "Arrive", v: inDate, s: `Check-in from ${CHECK_IN_TIME}` },
              { k: due ? "Pay at check-in" : "Payment", v: rupees(booking.amountInr), s: due ? "Cash, card or UPI" : paymentLabel(booking) },
              { k: "Find us", v: "JC Nagar", s: "Chamundi Hills Main Rd" },
            ].map((item, i) => (
              <li key={item.k} className="bg-[var(--dd-hero-base)] p-5">
                <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.24em] text-[var(--dd-gold)]">
                  <span className="mr-2 text-[var(--dd-cream)]/35">0{i + 1}</span>
                  {item.k}
                </p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--dd-cream)]">{item.v}</p>
                <p className="mt-1 text-[13px] text-[var(--dd-cream)]/55">{item.s}</p>
              </li>
            ))}
          </motion.ol>
        )}

        <motion.div {...rise(4)} className="mt-10 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => window.print()} className="dd-btn dd-btn--solid">
            Print / save PDF
          </button>
          {live && (
            <a href={icsHref(booking)} download={`deccan-dwell-${booking.id}.ics`} className="dd-btn">
              Add to calendar
            </a>
          )}
          <a href={MAPS_URL} target="_blank" rel="noreferrer" className="dd-btn">
            Directions
          </a>
        </motion.div>

        <motion.div {...rise(5)} className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--dd-line-dark)] pt-6 text-[13px] text-[var(--dd-cream)]/55">
          <span>
            Need a change? <a href={HOTEL.phones[0].href} className="text-[var(--dd-cream)] hover:text-[var(--dd-gold)]">{HOTEL.phones[0].label}</a>
            {" · "}
            <a href={`mailto:${HOTEL.email}`} className="text-[var(--dd-cream)] hover:text-[var(--dd-gold)]">{HOTEL.email}</a>
          </span>
          <Link href="/booking/lookup" className="dd-link text-[var(--dd-gold)]">Find another booking</Link>
        </motion.div>
      </div>

      {/* ——— Right: the printer and its slip ——— */}
      <div className="dd-ticket-stage relative order-1 mx-auto w-full max-w-[420px] lg:order-2">
        <div aria-hidden className="pointer-events-none absolute -inset-x-24 -top-10 h-[520px] bg-[radial-gradient(closest-side,rgba(197,160,89,0.20),transparent)] blur-2xl" />

        {/* Printer */}
        <motion.div
          initial={still ? false : { opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
          className="dd-ticket-printer relative z-20 mx-auto h-[86px] w-full rounded-[22px] border border-[var(--dd-gold)]/25 bg-[linear-gradient(180deg,#0d4a40_0%,#03332c_55%,#022a24_100%)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <div className="absolute left-6 top-[18px] flex items-center gap-3">
            <span className="dd-ticket-led relative h-2 w-2 rounded-full bg-[var(--dd-gold)]" />
            <span className="font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.32em] text-[var(--dd-cream)]/55">
              Front desk
            </span>
          </div>
          <span
            aria-hidden
            className="absolute right-6 top-[14px] h-[18px] w-[64px] bg-[var(--dd-gold)]/80"
            style={{ WebkitMaskImage: "url(/images/logo.png)", maskImage: "url(/images/logo.png)", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "right center", maskPosition: "right center" }}
          />
          {/* The slot */}
          <div className="absolute inset-x-5 bottom-[12px] h-[8px] rounded-full bg-[#010f0d] shadow-[inset_0_2px_3px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.06)]" />
        </motion.div>

        {/* Paper — clipped at the slot, free to fall below it */}
        <div className="relative z-10 -mt-[22px] px-[34px]" style={{ clipPath: "inset(0 -80px -200px -80px)" }}>
          <motion.div
            className="origin-top"
            initial={still ? false : { y: "-100%" }}
            animate={still ? { y: "0%" } : { y: feedY }}
            transition={still ? { duration: 0 } : { duration: FEED_DURATION, delay: FEED_START, times: feedTimes, ease: "easeInOut" }}
          >
            <motion.div
              initial={still ? false : { y: 0, rotate: 0 }}
              animate={{ y: [0, 0, 26, 18], rotate: [0, 0, -2.2, -1.4] }}
              transition={still ? { duration: 0 } : { duration: 0.9, delay: TEAR_AT, times: [0, 0.01, 0.55, 1], ease: EASE }}
              className="dd-ticket-shadow"
            >
              <article className="dd-ticket-paper relative bg-[#fbf7ef] px-7 pb-10 pt-9 font-mono text-[12.5px] leading-[1.75] text-[#13302a]">
                {/* Header */}
                <div className="text-center">
                  <span
                    aria-hidden
                    className="mx-auto block h-[46px] w-[150px] bg-[#13302a]"
                    style={{ WebkitMaskImage: "url(/images/logo.png)", maskImage: "url(/images/logo.png)", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }}
                  />
                  <p className="mt-3 font-[family-name:var(--font-display)] text-[22px] italic leading-none tracking-normal">A home away from home</p>
                  <p className="mt-3 text-[10.5px] leading-snug text-[#13302a]/60">
                    Chamundi Hills Main Road, JC Nagar
                    <br />
                    Mysuru 570011 · {HOTEL.phones[0].label}
                  </p>
                </div>

                <div className="dd-ticket-rule my-5" />
                <p className="text-center text-[11px] uppercase tracking-[0.3em]">Booking receipt</p>
                <div className="dd-ticket-rule my-5" />

                <div className="space-y-0.5">
                  <Row label="No." value={booking.id.toUpperCase()} />
                  <Row label="Issued" value={issued} />
                  <Row label="Guest" value={booking.guestName} />
                </div>

                <div className="dd-ticket-rule my-5" />

                <div className="space-y-0.5">
                  <Row label="Room" value={booking.roomName} />
                  <Row label="Check-in" value={`${format(parseISO(booking.checkIn), "dd MMM")} · ${CHECK_IN_TIME}`} />
                  <Row label="Check-out" value={`${format(parseISO(booking.checkOut), "dd MMM")} · ${CHECK_OUT_TIME}`} />
                  <Row label="Nights" value={String(nights)} />
                  <Row label="Guests" value={String(booking.guests)} />
                </div>

                <div className="dd-ticket-rule my-5" />

                <div className="space-y-0.5">
                  <Row label={`${booking.roomName} × ${nights}`} value={rupees(booking.amountInr)} />
                  <Row label="Taxes & fees" value="Included" />
                </div>
                <div className="mt-3 border-t-2 border-[#13302a] pt-3">
                  <Row label="Total" value={rupees(booking.amountInr)} strong />
                  <Row label="Payment" value={paymentLabel(booking)} />
                </div>

                <div className="dd-ticket-rule my-6" />

                {/* Barcode */}
                <div className="flex h-[46px] items-stretch justify-center gap-[1.5px]" aria-hidden>
                  {barcode(booking.id).map((w, i) => (
                    <span key={i} className={i % 2 === 0 ? "bg-[#13302a]" : "bg-transparent"} style={{ width: w * 1.6 }} />
                  ))}
                </div>
                <p className="mt-2 text-center text-[10px] tracking-[0.4em] text-[#13302a]/60">{booking.id.toUpperCase()}</p>

                <p className="mt-6 text-center font-[family-name:var(--font-display)] text-[19px] italic leading-snug">
                  Thank you, {firstName}.
                </p>
                <p className="text-center text-[10.5px] text-[#13302a]/55">Show this slip or your booking no. at the desk.</p>

                {/* Stamp */}
                <motion.div
                  aria-hidden
                  initial={still ? false : { opacity: 0, scale: 2.2, rotate: -22 }}
                  animate={{ opacity: 1, scale: 1, rotate: -12 }}
                  transition={still ? { duration: 0 } : { delay: STAMP_AT, type: "spring", stiffness: 520, damping: 22, mass: 0.9 }}
                  className={`dd-ticket-stamp dd-ticket-stamp--${copy.tone} pointer-events-none absolute right-4 top-[196px]`}
                >
                  <span>{copy.stamp}</span>
                  <small>Deccan Dwell · Mysuru</small>
                </motion.div>
                {/* Sheen that sweeps once the slip is torn off */}
                {!still && (
                  <motion.span
                    aria-hidden
                    initial={{ x: "-120%" }}
                    animate={{ x: "120%" }}
                    transition={{ delay: STAMP_AT + 0.35, duration: 1.3, ease: [0.65, 0, 0.35, 1] }}
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.65)_50%,transparent_65%)] mix-blend-soft-light"
                  />
                )}
              </article>
            </motion.div>
          </motion.div>
        </div>

        <motion.p
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: STAMP_AT + 0.6, duration: 0.8 }}
          className="dd-ticket-caption mt-8 text-center font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.3em] text-[var(--dd-cream)]/40"
        >
          Booking no. <span className="text-[var(--dd-gold)]">{booking.id.toUpperCase()}</span>
        </motion.p>
      </div>
    </div>
  );
}
