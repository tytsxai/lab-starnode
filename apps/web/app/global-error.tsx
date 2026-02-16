'use client'

import { useEffect } from 'react'

interface GlobalErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error('[StarNode][global-error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack
    })
  }, [error])

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <main style={{ maxWidth: 640, textAlign: 'center' }}>
          <h1 style={{ marginBottom: 12 }}>系统遇到严重错误</h1>
          <p style={{ opacity: 0.85, marginBottom: 16 }}>
            当前页面无法继续渲染。系统已输出错误日志，建议先重试或刷新。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button onClick={reset} style={{ padding: '8px 14px', cursor: 'pointer' }}>
              重新加载应用
            </button>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 14px', cursor: 'pointer' }}>
              刷新页面
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
