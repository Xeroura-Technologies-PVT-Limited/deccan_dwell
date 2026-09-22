import { NextResponse } from "next/server";
import { listPublicRooms } from "@/lib/inventory";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ rooms: await listPublicRooms() });
}