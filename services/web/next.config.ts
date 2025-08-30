import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable hot reloading in Docker
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  // Disable strict mode for faster development
  reactStrictMode: false,
  // Enable experimental features for better Docker support
  experimental: {
    // Enable faster refresh
    turbo: {
      rules: {},
    },
  },
};

export default nextConfig;
