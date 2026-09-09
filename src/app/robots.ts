import type { MetadataRoute } from "next";

const BASE = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

// read NEXTAUTH_URL at request time, not build time
export const dynamic = "force-dynamic";

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
