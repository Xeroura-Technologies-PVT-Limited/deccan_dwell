import { NextResponse } from "next/server";
import { z } from "zod";
import { loginUser, registerGuest, setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(8),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: session });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const intent = body?.intent === "register" ? "register" : "login";

  if (intent === "register") {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your details" }, { status: 400 });
    }
    const result = await registerGuest(parsed.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    await setSessionCookie(result.user);
    return NextResponse.json({ user: result.user });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details" }, { status: 400 });
  }
  const result = await loginUser(parsed.data.email, parsed.data.password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  await setSessionCookie(result.user);
  return NextResponse.json({ user: result.user });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
