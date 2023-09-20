/** @type {import('next').NextConfig} */

await import("./env.mjs");

const nextConfig = {
  ignoreDuringBuilds: true,
  // reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
