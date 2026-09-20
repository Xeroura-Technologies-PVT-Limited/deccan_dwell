import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingReceipt } from "@/components/BookingReceipt";
import { getBookingByIdAndEmail } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { bookingId } = await params;
  const { email } = await searchParams;
  if (!email) notFound();
  const booking = await getBookingByIdAndEmail(bookingId, email);
  if (!booking) notFound();

  return (
    <main className="min-h-screen bg-[var(--dd-hero-base)] px-6 py-12 text-[var(--dd-cream)] md:px-10 lg:px-14">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.28em] text-[var(--dd-gold)]">
          Deccan Dwell
        </Link>
        <BookingReceipt booking={booking} />
        <Link href="/booking/lookup" className="mt-8 inline-block font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.2em] text-[var(--dd-gold)]">
          Look up another booking
        </Link>
      </div>
    </main>
  );
}
