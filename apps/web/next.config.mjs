/** @type {import('next').NextConfig} */
const allowUnsafeBuildBypass = process.env.STARNODE_ALLOW_UNSAFE_BUILD === '1'

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]

if (allowUnsafeBuildBypass) {
  // 仅供本地临时排障：生产环境禁止开启。
  console.warn('[StarNode] 检测到 STARNODE_ALLOW_UNSAFE_BUILD=1，已临时放宽 build 阶段 TS/ESLint 门禁。')
}

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@starnode/core', '@starnode/renderer', '@starnode/storage'],
  typescript: {
    // 生产默认 fail-closed：类型错误必须阻断发布。
    ignoreBuildErrors: allowUnsafeBuildBypass
  },
  eslint: {
    // 生产默认 fail-closed：lint 错误必须阻断发布。
    ignoreDuringBuilds: allowUnsafeBuildBypass
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ]
  },
  poweredByHeader: false
}

export default nextConfig
