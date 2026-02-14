'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const UniverseScene = dynamic(
  () => import('./UniverseScene').then((module) => module.UniverseScene),
  { ssr: false }
)

interface IdleCallbackDeadline {
  didTimeout: boolean
  timeRemaining: () => number
}

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleCallbackDeadline) => void,
    options?: { timeout: number }
  ) => number
  cancelIdleCallback?: (handle: number) => void
}

export function DeferredUniverseScene() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const idleWindow = window as IdleCapableWindow

    // 优先在浏览器空闲时加载 3D 场景，减少主线程初始阻塞。
    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const handle = idleWindow.requestIdleCallback(() => setReady(true), { timeout: 900 })
      return () => idleWindow.cancelIdleCallback?.(handle)
    }

    // Safari 等不支持 requestIdleCallback 的场景走轻量降级。
    const timer = window.setTimeout(() => setReady(true), 120)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready) return null
  return <UniverseScene />
}
