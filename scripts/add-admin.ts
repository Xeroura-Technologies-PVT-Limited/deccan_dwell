/**
 * Add (or promote) one more front-desk admin without touching the others.
 * Usage: NEW_ADMIN_EMAIL=… NEW_ADMIN_PASSWORD=… npx tsx scripts/add-admin.ts
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { normalizeEmail } from "../src/lib/users";

async function main() {
  const email = normalizeEmail(process.env.NEW_ADMIN_EMAIL ?? "");
  const password = process.env.NEW_ADMIN_PASSWORD ?? "";
  if (!email.includes("@") || password.length < 12) throw new Error("Need NEW_ADMIN_EMAIL and a 12+ character NEW_ADMIN_PASSWORD");
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: "admin", passwordHash } });
    console.log(`✓ ${email} updated to admin`);
  } else {
    await prisma.user.create({
      data: {
        id: `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        email,
        name: "Deccan Dwell",
        phone: "+91 9945 465 380",
        role: "admin",
        passwordHash,
        createdAt: new Date().toISOString(),
      },
    });
    console.log(`✓ ${email} created as admin`);
  }
  const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } });
  console.log("Admins now:", admins.map((a) => a.email).join(", "));
}

main().finally(() => prisma.$disconnect());
