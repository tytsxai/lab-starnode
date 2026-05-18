import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET, HEAD } from './route'

describe('api/health route', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('GET should return ok payload with non-cacheable headers', async () => {
    // GitHub Actions always sets GITHUB_SHA on its runners. Stub it empty
    // so we exercise the no-commit branch.
    vi.stubEnv('GITHUB_SHA', '')

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')?.toLowerCase()).toContain('no-store')

    const payload = await response.json()
    expect(payload.status).toBe('ok')
    expect(payload.service).toBe('starnode-web')
    expect(Number.isFinite(Date.parse(payload.now))).toBe(true)
    expect(payload.commit).toBeNull()
  })

  it('GET should expose commit sha from runtime env', async () => {
    vi.stubEnv('GITHUB_SHA', 'commit-from-ci')

    const response = await GET()
    const payload = await response.json()

    expect(payload.commit).toBe('commit-from-ci')
  })

  it('HEAD should return 200 with no-store cache policy', async () => {
    const response = await HEAD()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')?.toLowerCase()).toContain('no-store')
    expect(await response.text()).toBe('')
  })
})
