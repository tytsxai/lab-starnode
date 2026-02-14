'use client'

import { EditorPanel } from '../components/EditorPanel'
import { UniversePanel } from '../components/UniversePanel'

export default function HomePage() {
  return (
    <main className="main">
      <EditorPanel />
      <UniversePanel />
    </main>
  )
}
