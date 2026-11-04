import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { listPublicRooms } from "@/lib/inventory";

export const runtime = "nodejs";

async function handleGET() {
  return NextResponse.json({ rooms: await listPublicRooms() });
}

// Every handler answers in JSON, even when something unexpected fails.
export async function GET(...args: Parameters<typeof handleGET>) {
  try {
    return await handleGET(...args);
  } catch (error) {
    return apiError(error);
  }
}
