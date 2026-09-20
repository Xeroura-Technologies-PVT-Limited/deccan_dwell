import Link from "next/link";
import { BookingLookupForm } from "@/components/BookingLookupForm";

export default function BookingLookupPage() {
  return (
    <main className="min-h-screen bg-[var(--dd-hero-base)] px-6 py-12 text-[var(--dd-cream)] md:px-10 lg:px-14">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.28em] text-[var(--dd-gold)]">
          Deccan Dwell
        </Link>
        <p className="mt-20 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.35em] text-[var(--dd-gold)]">Find your stay</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">Booking lookup</h1>
        <p className="mt-4 max-w-xl text-[var(--dd-cream)]/65">
          Enter the booking ID from your confirmation and the email used for the reservation.
        </p>
        <BookingLookupForm />
      </div>
    </main>
  );
}
