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

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. Scripts stay limited to this site, Razorpay
 * checkout and Google Analytics. 'unsafe-inline' is needed for Next's inline
 * bootstrap and the intro gate; the real wins here are blocking framing,
 * plugins, foreign <base> tags and off-site form posts.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://*.razorpay.com https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.razorpay.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""} https://*.razorpay.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`,
  "frame-src https://*.razorpay.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.razorpay.com",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\" \"https://api.razorpay.com\")" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private pages: keep them out of search results and caches.
      {
        source: "/(admin|account|booking|login|signup)(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  allowedDevOrigins: lanHosts(),
  images: {
    qualities: [75, 90, 95],
  },
  serverExternalPackages: ["@prisma/client", "prisma", "razorpay", "bcryptjs", "nodemailer", "jose"],
};

export default nextConfig;
