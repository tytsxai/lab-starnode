import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const HEALTH_HEADERS = {
  // 健康探针必须读取实时结果，避免被 CDN/代理缓存导致误判。
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
}

function createHealthPayload() {
  // Use || (not ??) so empty-string env vars fall through to null.
  // Real example: GitHub Actions runners always export GITHUB_SHA, but
  // when the route runs outside a deploy context the value can be ''.
  return {
    status: 'ok',
    service: 'starnode-web',
    now: new Date().toISOString(),
    commit:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      null
  }
}

export async function GET() {
  return NextResponse.json(createHealthPayload(), {
    status: 200,
    headers: HEALTH_HEADERS
  })
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: HEALTH_HEADERS
  })
}
