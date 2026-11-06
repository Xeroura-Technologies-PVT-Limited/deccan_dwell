import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listAdminBookings } from "@/lib/inventory";
import { AdminApp } from "@/components/admin/desk/AdminApp";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Front desk",
  robots: { index: false },
};

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  const bookings = await listAdminBookings();
  return <AdminApp email={admin.email} bookings={bookings} />;
}
