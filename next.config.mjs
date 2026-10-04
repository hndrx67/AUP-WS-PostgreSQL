/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dev assets isolated from production builds when both run from this checkout.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};
export default nextConfig;
