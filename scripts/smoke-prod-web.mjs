import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.STARNODE_SMOKE_PORT ?? 4010)
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`
const START_TIMEOUT_MS = 20_000
const WEB_WORKDIR = fileURLToPath(new URL('../apps/web/', import.meta.url))

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServerReady() {
  const startedAt = Date.now()
  // 轮询健康检查端点，不依赖日志文本，避免 next 输出格式变化导致误判。
  while (Date.now() - startedAt < START_TIMEOUT_MS) {
    try {
      const response = await fetch(HEALTH_URL)
      if (response.ok) return
    } catch {
      // ignore
    }
    await sleep(300)
  }
  throw new Error(`等待 Web 服务启动超时（>${START_TIMEOUT_MS}ms）`)
}

function assertSecurityHeaders(response) {
  const requiredHeaders = new Map([
    ['x-frame-options', 'DENY'],
    ['x-content-type-options', 'nosniff'],
    ['referrer-policy', 'strict-origin-when-cross-origin'],
    ['permissions-policy', 'camera=(), microphone=(), geolocation=()']
  ])

  for (const [header, expected] of requiredHeaders.entries()) {
    const actual = response.headers.get(header)
    if (actual !== expected) {
      throw new Error(`安全响应头校验失败：${header}，期望=${expected}，实际=${actual ?? 'null'}`)
    }
  }

  const cacheControl = response.headers.get('cache-control')?.toLowerCase() ?? ''
  if (!cacheControl.includes('no-store')) {
    throw new Error(`健康探针缓存策略校验失败：cache-control 需包含 no-store，实际=${cacheControl || 'null'}`)
  }
}

async function run() {
  console.log('[Smoke] 启动生产服务并执行健康探针校验...')

  const child = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    cwd: WEB_WORKDIR
  })

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[next] ${String(chunk)}`)
  })
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[next:error] ${String(chunk)}`)
  })

  try {
    await waitForServerReady()
    const response = await fetch(HEALTH_URL)
    if (!response.ok) {
      throw new Error(`健康探针返回异常状态码：${response.status}`)
    }

    assertSecurityHeaders(response)
    const payload = await response.json()
    if (payload.status !== 'ok') {
      throw new Error(`健康探针 payload.status 非 ok：${JSON.stringify(payload)}`)
    }
    console.log('[Smoke] 健康探针与关键安全响应头校验通过。')
  } finally {
    child.kill('SIGTERM')
  }
}

run().catch((error) => {
  console.error('[Smoke] 失败：', error)
  process.exitCode = 1
})
