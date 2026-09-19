import { cookies } from "next/headers";
import {
  readSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  type SessionUser,
  type UserRole,
} from "./session";

export type { SessionUser, UserRole };
export { loginUser, registerGuest, ensureAdminUser, normalizeEmail } from "./users";

export async function getSession() {
  const jar = await cookies();
  return readSession(jar.get(SESSION_COOKIE)?.value);
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
