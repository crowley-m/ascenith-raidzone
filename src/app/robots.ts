import type { MetadataRoute } from "next";

const BASE = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/portal", "/me", "/api"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
