'use client'

import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 先保证生产可观测：统一把运行时异常打到控制台，方便接入日志平台采集。
    console.error('[StarNode][route-error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack
    })
  }, [error])

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ maxWidth: 560, textAlign: 'center' }}>
        <h1 style={{ marginBottom: 12 }}>页面出现异常</h1>
        <p style={{ opacity: 0.85, marginBottom: 16 }}>
          系统已记录错误信息。你可以先重试；若问题持续，请联系维护者并附带时间与操作路径。
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button onClick={reset} style={{ padding: '8px 14px', cursor: 'pointer' }}>
            重试当前页面
          </button>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 14px', cursor: 'pointer' }}>
            刷新页面
          </button>
        </div>
      </section>
    </main>
  )
}
