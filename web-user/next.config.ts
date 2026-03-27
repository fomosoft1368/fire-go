import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || 'http://192.168.1.12:3000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
