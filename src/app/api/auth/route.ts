import { apiError } from "@/lib/api-errors";
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

async function handleGET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: session });
}

async function handlePOST(request: Request) {
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
