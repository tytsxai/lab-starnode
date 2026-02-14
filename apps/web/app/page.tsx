import { DeferredUniverseScene } from '../components/DeferredUniverseScene'
import { EditorPanel } from '../components/EditorPanel'
import { UniversePanel } from '../components/UniversePanel'

export default function HomePage() {
  return (
    <main className="main">
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <DeferredUniverseScene />
      </div>
      <EditorPanel />
      <UniversePanel />
    </main>
  )
}
