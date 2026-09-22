import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminCalendar } from "@/lib/inventory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  return NextResponse.json({ month, rows: await getAdminCalendar(month) });
}