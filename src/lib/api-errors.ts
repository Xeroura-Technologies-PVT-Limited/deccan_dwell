import { NextResponse } from "next/server";

/**
 * Turn an unexpected server error into a JSON response the site can show.
 * Database connection problems (wrong DATABASE_URL, Supabase paused, network)
 * get their own 503 message; everything else is a generic 500.
 */
export function apiError(error: unknown) {
  console.error("[api]", error);
  const name = (error as { name?: string })?.name ?? "";
  const code = (error as { code?: string })?.code ?? "";
  const isDb =
    name.startsWith("PrismaClientInitialization") ||
    name === "PrismaClientRustPanicError" ||
    ["P1000", "P1001", "P1002", "P1003", "P1008", "P1010", "P1011", "P1017", "P2021", "P2022"].includes(code);
  if (isDb) {
    return NextResponse.json(
      {
        error:
          "Our reservation system can't reach its database right now. Please try again shortly, or call us on +91 9945 465 380.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: "Something went wrong on our side. Please try again." },
    { status: 500 },
  );
}
