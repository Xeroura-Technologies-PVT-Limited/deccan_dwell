import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      images: [`${SITE_URL}/og-image.jpg`, `${SITE_URL}/images/room-deluxe.jpg`, `${SITE_URL}/images/room-suite.jpg`],
    },
  ];
}
