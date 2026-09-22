import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { listAdminRooms, updateAdminRoom } from "@/lib/inventory";

export const runtime = "nodejs";

const roomSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  image: z.string().min(1).optional(),
  basePriceInr: z.number().int().min(0).optional(),
  totalUnits: z.number().int().min(1).optional(),
});

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ rooms: await listAdminRooms() });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = roomSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid room details" }, { status: 400 });
  const result = await updateAdminRoom(parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ room: result.room });
}