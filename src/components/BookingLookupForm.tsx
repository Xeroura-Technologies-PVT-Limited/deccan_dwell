"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function BookingLookupForm() {
  const router = useRouter();
  const [bookingId, setBookingId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ bookingId, email });
      const response = await fetch(`/api/bookings/lookup?${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not find booking");
      router.push(`/booking/${data.booking.id}?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 max-w-xl space-y-6">
      <label className="block">
        <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
          Booking ID
        </span>
        <input
          required
          value={bookingId}
          onChange={(event) => setBookingId(event.target.value)}
          placeholder="bk_..."
          className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none"
        />
      </label>
      <label className="block">
        <span className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
          Booking email
        </span>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="mt-2 w-full border-b border-[var(--dd-gold)]/40 bg-transparent py-3 outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="border border-[var(--dd-gold)] px-6 py-3 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.2em] text-[var(--dd-cream)] transition hover:bg-[var(--dd-gold)] hover:text-[var(--dd-green)] disabled:opacity-50"
      >
        {loading ? "Looking up…" : "Find booking"}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </form>
  );
}
