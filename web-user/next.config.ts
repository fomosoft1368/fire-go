import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const nextConfig: NextConfig = {
  output: 'standalone',   // ← tạo .next/standalone gọn nhẹ để deploy

  // ── CORS headers ─────────────────────────────────────────────────
  // Browsers yêu cầu 1 origin cụ thể (không phải comma-separated list)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://firego.vn' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
          { key: 'Vary', value: 'Origin' },
        ],
      },
      {
        source: '/img/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://firego.vn' },
          { key: 'Vary', value: 'Origin' },
        ],
      },
    ]
  },


  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      // VnExpress
      { protocol: 'https', hostname: 'i1-kinhdoanh.vnecdn.net' },
      { protocol: 'https', hostname: 'i1-thethao.vnecdn.net' },
      { protocol: 'https', hostname: 'i1-vnexpress.vnecdn.net' },
      { protocol: 'https', hostname: 'vcdn-vnexpress.vnecdn.net' },
      { protocol: 'https', hostname: '*.vnecdn.net' },
      // Tuổi Trẻ
      { protocol: 'https', hostname: 'cdn.tuoitre.vn' },
      { protocol: 'https', hostname: '*.tuoitre.vn' },
      // Dân Trí
      { protocol: 'https', hostname: 'cdnphoto.dantri.com.vn' },
      { protocol: 'https', hostname: '*.dantri.com.vn' },
      // Thanh Niên
      { protocol: 'https', hostname: '*.thanhnien.vn' },
      // Catch-all for any http image
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;

