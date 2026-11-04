import { networkInterfaces } from "os";
import type { NextConfig } from "next";

/** LAN IPs so iPhone Safari can load /_next assets in `next dev`. */
function lanHosts() {
  const hosts = new Set<string>(["127.0.0.1"]);
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      // Older Node versions report `family` as the number 4.
      const family = a.family as string | number;
      if (!a.internal && (family === "IPv4" || family === 4)) {
        hosts.add(a.address);
      }
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts(),
  images: {
    qualities: [75, 90, 95],
  },
  serverExternalPackages: ["@prisma/client", "prisma", "razorpay", "bcryptjs", "nodemailer", "jose"],
};

export default nextConfig;
