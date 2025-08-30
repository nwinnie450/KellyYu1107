/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wx1.sinaimg.cn',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wx2.sinaimg.cn',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wx3.sinaimg.cn',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wx4.sinaimg.cn',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tva1.sinaimg.cn',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sns-img-bd.xhscdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ci.xiaohongshu.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'v.douyin.com',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
  // Compression and optimization
  compress: true,
  poweredByHeader: false,
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Redirect configuration
  async redirects() {
    return []
  },
  // Rewrite configuration for API proxying
  async rewrites() {
    return []
  }
}

module.exports = nextConfig