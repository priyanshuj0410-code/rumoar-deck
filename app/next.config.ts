import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
      : [],
  },
  async rewrites() {
    // Only load-bearing locally: on Vercel the static file already answers /landing.
    return { beforeFiles: [{ source: "/landing", destination: "/landing.html" }] };
  },
  async headers() {
    return [
      {
        // The worker must not be cached, or clients pin themselves to a stale shell.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
