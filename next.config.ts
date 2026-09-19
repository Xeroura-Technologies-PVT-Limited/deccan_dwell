import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 90, 95],
  },
  serverExternalPackages: ["@prisma/client", "prisma", "razorpay", "bcryptjs", "nodemailer", "jose"],
};

export default nextConfig;
