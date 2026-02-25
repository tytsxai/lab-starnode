#!/usr/bin/env node

function toBool(value) {
  if (!value) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

const unsafeBuildBypassEnabled = process.env.STARNODE_ALLOW_UNSAFE_BUILD === '1'
const isCi = toBool(process.env.CI)
const isGithubActions = toBool(process.env.GITHUB_ACTIONS)
const isVercelBuild = toBool(process.env.VERCEL) || typeof process.env.VERCEL_ENV === 'string'
const isRailwayBuild = (process.env.RAILWAY_ENVIRONMENT ?? '').trim().length > 0
const isManagedBuild = isCi || isGithubActions || isVercelBuild || isRailwayBuild

if (unsafeBuildBypassEnabled && isManagedBuild) {
  console.error('[Build Safety Gate] 检测到 STARNODE_ALLOW_UNSAFE_BUILD=1 且当前为 CI/托管构建环境。')
  console.error('[Build Safety Gate] 为避免带病构建进入生产，本次 build 已阻断。请移除该变量后重试。')
  process.exit(1)
}

if (unsafeBuildBypassEnabled) {
  console.warn('[Build Safety Gate] STARNODE_ALLOW_UNSAFE_BUILD=1 已开启：仅允许本地临时排障。')
  process.exit(0)
}

console.log('[Build Safety Gate] 构建环境检查通过：未开启不安全构建旁路。')
