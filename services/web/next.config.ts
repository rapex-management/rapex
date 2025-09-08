import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimized for FAST Hot Reloading in Docker
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 250, // Much faster polling for instant detection
        aggregateTimeout: 100, // Faster rebuild trigger
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
          '**/*.log',
          '**/.env*',
        ],
      };
    }
    return config;
  },
  
  reactStrictMode: false, // Disable for faster development
  
  experimental: {
    // Optimizations for Next.js 15
  },
  
  compress: true,
  poweredByHeader: false,
  
  // API configuration
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
  
  // Environment variables
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',
    // ENABLE Fast Refresh for instant hot reloading
    FAST_REFRESH: 'true',
  },
};

export default nextConfig;
