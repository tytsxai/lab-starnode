import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.STARNODE_SMOKE_PORT ?? 4010)
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`
const START_TIMEOUT_MS = 20_000
const WEB_WORKDIR = fileURLToPath(new URL('../apps/web/', import.meta.url))
const WEB_BUILD_ID_PATH = fileURLToPath(new URL('../apps/web/.next/BUILD_ID', import.meta.url))

/**
 * @typedef {{ type: 'exit'; code: number | null; signal: NodeJS.Signals | null } | { type: 'error'; error: Error }} ChildExitState
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function assertBuildOutputReady() {
  try {
    await access(WEB_BUILD_ID_PATH)
  } catch {
    throw new Error(`未找到生产构建产物：${WEB_BUILD_ID_PATH}。请先执行 web build 再运行 smoke。`)
  }
}

/**
 * @param {import('node:child_process').ChildProcessWithoutNullStreams} child
 */
function bindChildExitState(child) {
  /** @type {ChildExitState | null} */
  let state = null
  child.once('error', (error) => {
    state = { type: 'error', error }
  })
  child.once('exit', (code, signal) => {
    state = { type: 'exit', code, signal }
  })

  return () => state
}

function formatChildExitState(state) {
  if (!state) return 'unknown'
  if (state.type === 'error') return `error=${state.error.message}`
  return `code=${state.code ?? 'null'}, signal=${state.signal ?? 'null'}`
}

async function waitForServerReady(getChildExitState) {
  const startedAt = Date.now()
  // 轮询健康检查端点，不依赖日志文本，避免 next 输出格式变化导致误判。
  while (Date.now() - startedAt < START_TIMEOUT_MS) {
    const exitState = getChildExitState()
    if (exitState) {
      throw new Error(`Web 服务在健康探针通过前已退出：${formatChildExitState(exitState)}`)
    }

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

/**
 * @param {import('node:child_process').ChildProcessWithoutNullStreams} child
 */
async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill('SIGTERM')

  const deadline = Date.now() + 5_000
  while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) {
    await sleep(100)
  }

  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL')
    await sleep(100)
  }
}

function assertSecurityHeaders(response) {
  const requiredHeaders = new Map([
    ['x-frame-options', 'DENY'],
    ['x-content-type-options', 'nosniff'],
    ['referrer-policy', 'strict-origin-when-cross-origin'],
    ['permissions-policy', 'camera=(), microphone=(), geolocation=()'],
    ['strict-transport-security', 'max-age=63072000; includeSubDomains; preload'],
    ['cross-origin-opener-policy', 'same-origin'],
    ['cross-origin-resource-policy', 'same-origin']
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
  await assertBuildOutputReady()

  const child = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    cwd: WEB_WORKDIR
  })
  const getChildExitState = bindChildExitState(child)

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[next] ${String(chunk)}`)
  })
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[next:error] ${String(chunk)}`)
  })

  try {
    await waitForServerReady(getChildExitState)
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
    await stopServer(child)
  }
}

run()
  .then(() => {
    // Force-exit on success so any lingering handles (npx's child Next.js
    // process, stdout/stderr pipes that didn't fully drain) don't keep
    // the event loop alive. Without this the job hangs for 14m on CI
    // until GitHub Actions cancels it.
    process.exit(0)
  })
  .catch((error) => {
    console.error('[Smoke] 失败：', error)
    process.exit(1)
  })
