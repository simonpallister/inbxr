import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["smtp-server", "mailparser"],
  reactStrictMode: true,
};

export default nextConfig;
