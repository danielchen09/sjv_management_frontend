import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      new URL('https://example.com/**'),
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL + '/**'),
    ],
  },
};

export default nextConfig;
