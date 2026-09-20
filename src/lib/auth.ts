import { cookies } from "next/headers";
import {
  readSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  type SessionUser,
  type UserRole,
} from "./session";
import { prisma } from "./db";

export type { SessionUser, UserRole };
export { loginUser, registerGuest, ensureAdminUser, normalizeEmail } from "./users";

export async function getSession() {
  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { email: true, name: true, phone: true, role: true },
  });
  if (!user) return null;

  return {
    ...session,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role === "admin" ? "admin" : "guest",
  };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}
