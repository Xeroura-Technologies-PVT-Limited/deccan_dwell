import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardMetrics } from "@/lib/inventory";
import { todayISO } from "@/lib/dates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") || todayISO();
  return NextResponse.json({ metrics: await getAdminDashboardMetrics(date) });
}