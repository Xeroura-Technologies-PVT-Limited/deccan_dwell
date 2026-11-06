import { apiError } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loginUser, registerGuest, setSessionCookie, clearSessionCookie, getSession, normalizeEmail } from "@/lib/auth";
import { clearHits, clientIp, hit, peekHits, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(6).max(200),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().max(160),
  phone: z.string().trim().min(8).max(20),
  password: z.string().min(8).max(200),
});

async function handleGET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: session });
}

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => null);
  const intent = body?.intent === "register" ? "register" : "login";
  const ip = clientIp(request);

  if (intent === "register") {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your details" }, { status: 400 });
    }
    const limit = await hit(`register:${ip}`, 5, 60 * 60);
    if (!limit.ok) return tooMany(limit.retryAfter);
    const result = await registerGuest(parsed.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    await setSessionCookie(result.user);
    return NextResponse.json({ user: result.user });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details" }, { status: 400 });
  }
  // 20 tries per IP and 8 failures per account in 15 minutes.
  const perIp = await hit(`login:${ip}`, 20, 15 * 60);
  if (!perIp.ok) return tooMany(perIp.retryAfter);
  const failKey = `login-fail:${normalizeEmail(parsed.data.email)}`;
  const fails = await peekHits(failKey);
  if (fails >= 8) return tooMany(15 * 60, "Too many wrong passwords for this account. Try again in 15 minutes.");
  const result = await loginUser(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    await hit(failKey, 8, 15 * 60);
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  await clearHits(failKey);
  await setSessionCookie(result.user);
  return NextResponse.json({ user: result.user });
}

async function handleDELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

// Every handler answers in JSON, even when something unexpected fails.
export async function GET(...args: Parameters<typeof handleGET>) {
  try {
    return await handleGET(...args);
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(...args: Parameters<typeof handlePOST>) {
  try {
    return await handlePOST(...args);
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(...args: Parameters<typeof handleDELETE>) {
  try {
    return await handleDELETE(...args);
  } catch (error) {
    return apiError(error);
  }
}
