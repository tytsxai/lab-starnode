import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StarNode',
  description: '思想的数字宇宙'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
