import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardMetrics } from "@/lib/inventory";
import { todayISO } from "@/lib/dates";

export const runtime = "nodejs";

async function handleGET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") || todayISO();
  return NextResponse.json({ metrics: await getAdminDashboardMetrics(date) });
}

// Every handler answers in JSON, even when something unexpected fails.
export async function GET(...args: Parameters<typeof handleGET>) {
  try {
    return await handleGET(...args);
  } catch (error) {
    return apiError(error);
  }
}
