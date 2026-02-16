import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'starnode-web',
      now: new Date().toISOString(),
      commit:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.GITHUB_SHA ??
        process.env.RAILWAY_GIT_COMMIT_SHA ??
        null
    },
    { status: 200 }
  )
}
