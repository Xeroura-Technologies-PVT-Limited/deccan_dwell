import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listAdminBookings } from "@/lib/inventory";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  const bookings = await listAdminBookings();
  return <AdminShell email={admin.email} bookings={bookings} />;
}
