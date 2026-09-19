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

  await prisma.booking.updateMany({
    where: { guestEmail: email, userId: null },
    data: { userId: user.id },
  });

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
  const password = process.env.ADMIN_PASSWORD || "DeccanAdmin1";
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
