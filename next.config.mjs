/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "**.sslip.io" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      // nginx forwards Host as `$host` (no port), so Next sees the host without
      // `:8443` while the browser's Origin header keeps it — that mismatch makes
      // Next abort every Server Action ("Invalid Server Actions request").
      // Allow both forms of the public origin.
      allowedOrigins: [
        "ascenith.147.189.172.101.sslip.io:8443",
        "ascenith.147.189.172.101.sslip.io",
      ],
    },
  },
};

export default nextConfig;
