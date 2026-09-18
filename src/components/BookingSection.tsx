"use client";

import { useMemo, useState, type FormEvent } from "react";
import { addDays, format } from "date-fns";
import { ROOM_TYPES } from "@/lib/inventory-client";

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function BookingSection() {
  const [roomTypeId, setRoomTypeId] = useState(ROOM_TYPES[0].id);
  const [checkIn, setCheckIn] = useState(todayISO);
  const [checkOut, setCheckOut] = useState(
    format(addDays(new Date(), 2), "yyyy-MM-dd"),
  );
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "held" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [amountInr, setAmountInr] = useState<number | null>(null);

  const room = useMemo(
    () => ROOM_TYPES.find((r) => r.id === roomTypeId),
    [roomTypeId],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not hold room");

      setBookingId(data.booking.id);
      setAmountInr(data.booking.amountInr);
      setStatus("held");
      setMessage(
        `Room held for ${data.holdMinutes} minutes. Amount ₹${data.booking.amountInr.toLocaleString("en-IN")}. Connect Razorpay keys to collect payment, then confirm.`,
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Booking failed");
    }
  }

  /** Demo confirm — replace with Razorpay success handler */
  async function simulatePayment() {
    if (!bookingId) return;
    setStatus("loading");
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        paymentId: `pay_demo_${Date.now()}`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Payment confirm failed");
      return;
    }
    setStatus("idle");
    setMessage(
      `Confirmed! Booking ${data.booking.id}. Availability will now show one fewer room for these dates.`,
    );
    setBookingId(null);
  }

  return (
    <section
      id="book"
      className="relative border-t border-[var(--dd-gold)]/15 bg-[var(--dd-green)] px-6 py-24 md:px-10 lg:px-14"
    >
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.35em] text-[var(--dd-gold)]">
            Reserve
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--dd-cream)] md:text-5xl">
            Book your stay
          </h2>
          <p className="mt-4 max-w-md font-[family-name:var(--font-body)] text-[var(--dd-cream)]/70">
            We hold your room for 15 minutes while you pay. After payment
            confirmation, inventory updates automatically for every guest on the
            site.
          </p>
          <p className="mt-8 font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]/80">
            Payment: Razorpay-ready · Demo confirm available
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 text-[var(--dd-cream)]">
          <label className="block">
            <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
              Room
            </span>
            <select
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 font-[family-name:var(--font-body)] outline-none"
            >
              {ROOM_TYPES.map((r) => (
                <option key={r.id} value={r.id} className="bg-[var(--dd-green)]">
                  {r.name} — ₹{r.basePriceInr.toLocaleString("en-IN")}/night
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
                Check in
              </span>
              <input
                type="date"
                required
                value={checkIn}
                min={todayISO()}
                onChange={(e) => setCheckIn(e.target.value)}
                className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none [color-scheme:dark]"
              />
            </label>
            <label className="block">
              <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
                Check out
              </span>
              <input
                type="date"
                required
                value={checkOut}
                min={format(addDays(new Date(checkIn), 1), "yyyy-MM-dd")}
                onChange={(e) => setCheckOut(e.target.value)}
                className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none [color-scheme:dark]"
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
              max={6}
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
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="submit"
              disabled={status === "loading"}
              className="border border-[var(--dd-gold)] px-6 py-3 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.2em] text-[var(--dd-cream)] transition hover:bg-[var(--dd-gold)] hover:text-[var(--dd-green)] disabled:opacity-50"
            >
              {status === "loading" ? "Please wait…" : "Hold & Continue"}
            </button>
            {status === "held" && bookingId && (
              <button
                type="button"
                onClick={simulatePayment}
                className="border border-[var(--dd-cream)]/40 px-6 py-3 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.2em] text-[var(--dd-cream)] transition hover:border-[var(--dd-gold)] hover:text-[var(--dd-gold)]"
              >
                Demo: Confirm Payment
                {amountInr != null ? ` · ₹${amountInr.toLocaleString("en-IN")}` : ""}
              </button>
            )}
          </div>

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
