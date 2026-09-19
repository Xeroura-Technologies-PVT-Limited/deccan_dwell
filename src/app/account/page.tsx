import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listGuestBookings } from "@/lib/inventory";
import { BookingsTable, SignOutButton } from "@/components/BookingsTable";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "admin") redirect("/admin");
  const bookings = await listGuestBookings({
    userId: session.id,
    email: session.email,
  });

  return (
    <main className="min-h-screen bg-[var(--dd-hero-base)] px-6 py-12 text-[var(--dd-cream)] md:px-10 lg:px-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.28em] text-[var(--dd-gold)]"
            >
              Deccan Dwell
            </Link>
            <p className="mt-6 font-[family-name:var(--font-nav)] text-[11px] uppercase tracking-[0.35em] text-[var(--dd-gold)]">
              Your stay
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl md:text-5xl">
              Hello, {session.name.split(" ")[0]}
            </h1>
            <p className="mt-3 max-w-xl font-[family-name:var(--font-body)] text-[var(--dd-cream)]/65">
              Bookings under {session.email}.{" "}
              <Link href="/#book" className="text-[var(--dd-gold)]">
                Reserve another stay
              </Link>
            </p>
          </div>
          <SignOutButton />
        </div>
        <BookingsTable initial={bookings} />
      </div>
    </main>
  );
}
