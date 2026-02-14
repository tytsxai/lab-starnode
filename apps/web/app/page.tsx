import { EditorPanel } from '../components/EditorPanel'
import { UniversePanel } from '../components/UniversePanel'
import { UniverseScene } from '../components/UniverseScene'

export default function HomePage() {
  return (
    <main className="main">
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <UniverseScene />
      </div>
      <EditorPanel />
      <UniversePanel />
    </main>
  )
}
