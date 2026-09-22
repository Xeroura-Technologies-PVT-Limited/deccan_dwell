"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ROOM_TYPES, extraGuests, stayTotalInr } from "@/lib/inventory-client";
import type { RoomType } from "@/lib/types";
import { EXTRA_BED_INR, HOUSE_RULES, CHECK_IN_TIME, CHECK_OUT_TIME } from "@/lib/hotel";
import { todayISO as indiaToday } from "@/lib/dates";
import type { AvailabilityResult, CalendarDay } from "@/lib/types";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import {
  loadRazorpayScript,
  type RazorpayCheckoutResponse,
} from "@/lib/razorpay-browser";

type PaymentSession = {
  keyId: string;
  orderId: string;
  amountPaise: number;
  amountInr: number;
  holdMinutes: number;
};

const ONLINE_PAYMENTS_ENABLED = false;

export function BookingSection() {
  const today = indiaToday();
  const [rooms, setRooms] = useState<RoomType[]>(ROOM_TYPES);
  const [roomTypeId, setRoomTypeId] = useState(ROOM_TYPES[0].id);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "held" | "paid" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [days, setDays] = useState<CalendarDay[] | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [quote, setQuote] = useState<AvailabilityResult | null>(null);

  const room = useMemo(
    () => rooms.find((r) => r.id === roomTypeId),
    [roomTypeId, rooms],
  );

  const stayTotal = room && quote ? stayTotalInr(room, quote.nights, guests) : 0;
  const extraBedCount = room ? extraGuests(room, guests) : 0;

  useEffect(() => {
    fetch("/api/rooms")
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.rooms) && data.rooms.length > 0) setRooms(data.rooms);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!room) return;
    if (guests > room.maxGuests) setGuests(room.maxGuests);
  }, [room, guests]);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (cancelled || !data.user || data.user.role === "admin") return;
      if (data.user.name) setGuestName(data.user.name);
      if (data.user.email) setGuestEmail(data.user.email);
      if (data.user.phone) setGuestPhone(data.user.phone);
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#book")) return;
    const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(query);
    const slug = params.get("room");
    const found = rooms.find((r) => r.slug === slug);
    if (found) setRoomTypeId(found.id);
    const inn = params.get("in");
    const out = params.get("out");
    if (inn) {
      setCheckIn(inn);
      setMonth(inn.slice(0, 7));
    }
    if (out) setCheckOut(out);
  }, [rooms]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setCalLoading(true);
      try {
        const res = await fetch(
          `/api/availability?month=${month}&roomTypeId=${roomTypeId}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load calendar");
        if (!cancelled) setDays(data.days as CalendarDay[]);
      } catch {
        if (!cancelled) setDays([]);
      } finally {
        if (!cancelled) setCalLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [month, roomTypeId, status]);

  useEffect(() => {
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    async function load() {
      const res = await fetch(
        `/api/availability?checkIn=${checkIn}&checkOut=${checkOut}&roomTypeId=${roomTypeId}`,
      );
      const data = await res.json();
      if (!cancelled && res.ok) {
        setQuote((data.availability as AvailabilityResult[])[0] ?? null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, roomTypeId]);

  function onPick(date: string) {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut("");
      return;
    }
    if (date <= checkIn) {
      setCheckIn(date);
      setCheckOut("");
      return;
    }
    const blocked = (days ?? []).some(
      (d) => d.date >= checkIn && d.date < date && d.soldOut,
    );
    if (blocked) {
      setMessage("That stay includes a sold-out night. Pick another range.");
      setStatus("error");
      return;
    }
    setCheckOut(date);
    setMessage(null);
    setStatus("idle");
  }

  async function openCheckout(
    session: PaymentSession,
    booking: { id: string; guestName: string; guestEmail: string; guestPhone: string },
  ) {
    await loadRazorpayScript();
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const checkout = new window.Razorpay({
        key: session.keyId,
        amount: session.amountPaise,
        currency: "INR",
        name: "Deccan Dwell",
        description: `${room?.name ?? "Stay"} · ${checkIn} → ${checkOut}`,
        order_id: session.orderId,
        prefill: {
          name: booking.guestName,
          email: booking.guestEmail,
          contact: booking.guestPhone,
        },
        notes: { bookingId: booking.id },
        theme: { color: "#024d43" },
        handler: (response: RazorpayCheckoutResponse) => {
          void confirmPayment(booking.id, response)
            .then(() => {
              settled = true;
              resolve();
            })
            .catch((err) => {
              settled = true;
              reject(err);
            });
        },
        modal: {
          ondismiss: () => {
            if (settled) return;
            settled = true;
            setStatus("held");
            setMessage(
              `Payment window closed. Your room is held for ${session.holdMinutes} minutes.`,
            );
            resolve();
          },
        },
      });
      checkout.open();
    });
  }

  async function confirmPayment(id: string, response: RazorpayCheckoutResponse) {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not confirm payment");
    setStatus("paid");
    setPayment(null);
    setMessage(
      `Paid in full. Booking ${data.booking.id} is confirmed for ${data.booking.checkIn} → ${data.booking.checkOut}.${
        data.email?.sent
          ? " A confirmation email is on the way."
          : " We will confirm by email once mail is connected."
      }`,
    );
    window.location.href = `/booking/${data.booking.id}?email=${encodeURIComponent(guestEmail)}`;
  }

  async function startPayment() {
    if (!bookingId || !payment) return;
    setStatus("loading");
    setMessage(null);
    try {
      await openCheckout(payment, {
        id: bookingId,
        guestName,
        guestEmail,
        guestPhone,
      });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Payment failed");
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const paymentMethod =
      submitter?.value === "at_hotel" ? "at_hotel" : "online";
    if (paymentMethod === "online" && !ONLINE_PAYMENTS_ENABLED) {
      setStatus("error");
      setMessage("Online payment is not available yet. Please pay at the hotel.");
      return;
    }
    if (!checkIn || !checkOut) {
      setStatus("error");
      setMessage("Pick check-in and check-out on the calendar.");
      return;
    }
    if (quote?.soldOut) {
      setStatus("error");
      setMessage("Sold out for those nights.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId,
          checkIn,
          checkOut,
          guests,
          guestName,
          guestEmail,
          guestPhone,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not hold room");

      if (paymentMethod === "at_hotel") {
        setBookingId(data.booking.id);
        setPayment(null);
        setStatus("paid");
        setMessage(
          `Reserved with no payment now. Pay ₹${data.booking.amountInr.toLocaleString("en-IN")} at the hotel. Booking ${data.booking.id} · ${data.booking.checkIn} → ${data.booking.checkOut}.${
            data.email?.sent
              ? " A confirmation email is on the way."
              : " We will confirm by email once mail is connected."
          }`,
        );
          window.location.href = `/booking/${data.booking.id}?email=${encodeURIComponent(guestEmail)}`;
        return;
      }

      const session: PaymentSession = {
        keyId: data.payment.keyId,
        orderId: data.payment.orderId,
        amountPaise: data.payment.amountPaise,
        amountInr: data.payment.amountInr,
        holdMinutes: data.holdMinutes,
      };
      setBookingId(data.booking.id);
      setPayment(session);
      setStatus("held");
      await openCheckout(session, data.booking);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Booking failed");
    }
  }

  const locked = status === "loading" || status === "held";

  return (
    <section
      id="book"
      className="relative border-t border-[var(--dd-gold)]/15 bg-[var(--dd-green)] px-6 py-24 md:px-10 lg:px-14"
    >
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.2fr]">
        <div>
          <p className="font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.35em] text-[var(--dd-gold)]">
            Reserve
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--dd-cream)] md:text-5xl">
            Book your stay
          </h2>
          <p className="mt-4 max-w-md font-[family-name:var(--font-body)] text-[var(--dd-cream)]/70">
            Each calendar day shows how many rooms are left. Reserve now and
            pay at the hotel.
          </p>
          {quote && !quote.soldOut && room && (
            <p className="mt-8 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
              {quote.nights} night{quote.nights === 1 ? "" : "s"} · {quote.availableUnits} left
              on the tightest night · ₹{stayTotal.toLocaleString("en-IN")}
              {extraBedCount > 0 ? ` · extra bed ₹${EXTRA_BED_INR}` : ""}
            </p>
          )}
          <ul className="mt-8 max-w-md space-y-2 font-[family-name:var(--font-body)] text-xs leading-relaxed text-[var(--dd-cream)]/55">
            {HOUSE_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 text-[var(--dd-cream)]">
          <label className="block">
            <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
              Room
            </span>
            <select
              value={roomTypeId}
              disabled={locked}
              onChange={(e) => {
                setRoomTypeId(e.target.value);
                setCheckIn("");
                setCheckOut("");
              }}
              className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 font-[family-name:var(--font-body)] outline-none"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id} className="bg-[var(--dd-green)]">
                  {r.name}
                  {r.subtitle ? ` · ${r.subtitle}` : ""} — ₹
                  {r.basePriceInr.toLocaleString("en-IN")}/night · {r.totalUnits} units
                </option>
              ))}
            </select>
          </label>

          <AvailabilityCalendar
            month={month}
            today={today}
            days={days}
            checkIn={checkIn}
            checkOut={checkOut}
            loading={calLoading || locked}
            onMonthChange={setMonth}
            onPick={onPick}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
                Check in · {CHECK_IN_TIME}
              </span>
              <input
                readOnly
                value={checkIn}
                placeholder="Pick a date"
                className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none"
              />
            </label>
            <label className="block">
              <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
                Check out · {CHECK_OUT_TIME}
              </span>
              <input
                readOnly
                value={checkOut}
                placeholder="Pick a later date"
                className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
              Guests
            </span>
            <input
              type="number"
              min={1}
              max={room?.maxGuests ?? 3}
              disabled={locked}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none"
            />
          </label>

          <label className="block">
            <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
              Full name
            </span>
            <input
              required
              disabled={locked}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
                Email
              </span>
              <input
                type="email"
                required
                disabled={locked}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none"
              />
            </label>
            <label className="block">
              <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
                Phone
              </span>
              <input
                required
                disabled={locked}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="submit"
              value="online"
              disabled={
                !ONLINE_PAYMENTS_ENABLED ||
                status === "loading" ||
                status === "paid" ||
                quote?.soldOut
              }
              title="Online payment is not available yet"
              className="border border-[var(--dd-gold)] px-6 py-3 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.2em] text-[var(--dd-cream)] transition hover:bg-[var(--dd-gold)] hover:text-[var(--dd-green)] disabled:opacity-50"
            >
              {ONLINE_PAYMENTS_ENABLED && status === "loading"
                ? "Please wait…"
                : "Pay online unavailable"}
            </button>
            <button
              type="submit"
              value="at_hotel"
              disabled={status === "loading" || status === "paid" || quote?.soldOut}
              className="border border-[var(--dd-cream)]/40 px-6 py-3 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.2em] text-[var(--dd-cream)] transition hover:border-[var(--dd-gold)] hover:text-[var(--dd-gold)] disabled:opacity-50"
            >
              Pay at hotel
            </button>
            {status === "held" && payment && (
              <button
                type="button"
                onClick={() => void startPayment()}
                className="border border-[var(--dd-cream)]/40 px-6 py-3 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.2em] text-[var(--dd-cream)] transition hover:border-[var(--dd-gold)] hover:text-[var(--dd-gold)]"
              >
                Resume payment
                {` · ₹${payment.amountInr.toLocaleString("en-IN")}`}
              </button>
            )}
          </div>

          <Link
            href="/booking/lookup"
            className="inline-block font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.18em] text-[var(--dd-gold)] hover:text-[var(--dd-cream)]"
          >
            Already booked? Look up your reservation
          </Link>

          {message && (
            <p
              className={`font-[family-name:var(--font-body)] text-sm ${
                status === "error" ? "text-red-300" : "text-[var(--dd-gold)]"
              }`}
            >
              {message}
              {room ? ` · ${room.name}` : ""}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
