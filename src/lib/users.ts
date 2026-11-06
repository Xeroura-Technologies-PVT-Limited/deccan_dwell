import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { SessionUser } from "./session";

function newUserId() {
  return `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function registerGuest(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "An account with this email already exists" };

  const user = await prisma.user.create({
    data: {
      id: newUserId(),
      email,
      name: input.name.trim(),
      phone: input.phone.trim(),
      role: "guest",
      passwordHash: await bcrypt.hash(input.password, 10),
      createdAt: new Date().toISOString(),
    },
  });

  // Earlier guest bookings with this email are NOT attached automatically:
  // sign-up doesn't verify the email yet, so anyone could register someone
  // else's address and see their stays. Those guests use "Find my booking".

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: "guest",
    },
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });
  if (!user) return { ok: false, error: "Invalid email or password" };
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return { ok: false, error: "Invalid email or password" };
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role === "admin" ? "admin" : "guest",
    },
  };
}

export async function ensureAdminUser() {
  const email = normalizeEmail(
    process.env.ADMIN_EMAIL || "decan.dwell@gmail.com",
  );
  // No built-in fallback password: a default that ships in the code is a
  // password anyone reading the repo knows.
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Set ADMIN_PASSWORD (12+ characters) in .env before seeding the admin user");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "admin", passwordHash, name: existing.name || "Deccan Dwell" },
    });
    return;
  }
  await prisma.user.create({
    data: {
      id: newUserId(),
      email,
      name: "Deccan Dwell",
      phone: "+91 9945 465 380",
      role: "admin",
      passwordHash,
      createdAt: new Date().toISOString(),
    },
  });
}
