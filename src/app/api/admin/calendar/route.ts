import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminCalendar } from "@/lib/inventory";

export const runtime = "nodejs";

async function handleGET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  return NextResponse.json({ month, rows: await getAdminCalendar(month) });
}

// Every handler answers in JSON, even when something unexpected fails.
export async function GET(...args: Parameters<typeof handleGET>) {
  try {
    return await handleGET(...args);
  } catch (error) {
    return apiError(error);
  }
}
