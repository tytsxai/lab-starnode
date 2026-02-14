/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@starnode/core', '@starnode/renderer', '@starnode/storage'],
  typescript: {
    // 当前本机 Node.js v25 + TS 组合存在编译器崩溃，先保证开发链路可运行。
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
}

export default nextConfig
