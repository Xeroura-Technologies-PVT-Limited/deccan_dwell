import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingReceipt } from "@/components/BookingReceipt";
import { getBookingByIdAndEmail } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your booking · Deccan Dwell",
  robots: { index: false },
};

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
    <main className="dd-grain relative min-h-screen overflow-hidden bg-[var(--dd-hero-base)] text-[var(--dd-cream)]">
      {/* Faint palace gate behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10]">
        <Image src="/images/hero-gate-graded-2000.jpg" alt="" fill sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--dd-hero-base)_0%,transparent_30%,var(--dd-hero-base)_95%)]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between px-[var(--dd-gutter)] py-7 print:hidden">
        <Link href="/?intro=0" aria-label="Deccan Dwell home">
          <Image src="/images/logo.png" alt="Deccan Dwell" width={132} height={44} className="h-11 w-auto" />
        </Link>
        <Link href="/?intro=0" className="dd-link font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.28em] text-[var(--dd-cream)]/70">
          Back to site
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-[1240px] px-[var(--dd-gutter)] pb-24 pt-6 lg:pt-12">
        <BookingReceipt booking={booking} />
      </div>
    </main>
  );
}
