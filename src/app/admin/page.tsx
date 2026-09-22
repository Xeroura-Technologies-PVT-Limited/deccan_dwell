import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listAdminBookings } from "@/lib/inventory";
import { BookingsTable, SignOutButton } from "@/components/BookingsTable";
import { AdminBookingRequests } from "@/components/AdminBookingRequests";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminCalendar } from "@/components/AdminCalendar";
import { AdminRooms } from "@/components/AdminRooms";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  const bookings = await listAdminBookings();

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
              Hotel desk
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl md:text-5xl">
              Bookings
            </h1>
            <p className="mt-3 max-w-xl font-[family-name:var(--font-body)] text-[var(--dd-cream)]/65">
              Signed in as {admin.email}. Cancel a stay or mark a pay-at-hotel
              booking as collected.
            </p>
          </div>
          <SignOutButton redirectTo="/admin/login" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/api/admin/bookings/export" className="border border-[var(--dd-gold)]/60 px-3 py-2 text-[10px] uppercase tracking-[0.14em]">Export CSV</a>
        </div>
        <AdminDashboard />
        <BookingsTable initial={bookings} admin />
        <AdminCalendar />
        <AdminRooms />
        <AdminBookingRequests />
      </div>
    </main>
  );
}
