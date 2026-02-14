'use client'

import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Line, OrbitControls, Stars, Text } from '@react-three/drei'
import type { PlanetLink, PlanetViewModel } from '@starnode/core'

interface PlanetCanvasProps {
  planets: PlanetViewModel[]
  links?: PlanetLink[]
  selectedPlanetId?: string
  onSelectPlanet?: (planetId: string) => void
}

function getOrbitPosition(index: number): [number, number, number] {
  const angle = (index / Math.max(1, 8)) * Math.PI * 2
  const x = Math.cos(angle) * (4 + index * 0.8)
  const z = Math.sin(angle) * (4 + index * 0.8)
  return [x, 0, z]
}

function PlanetNode({
  planet,
  position,
  selected,
  onSelectPlanet
}: {
  planet: PlanetViewModel
  position: [number, number, number]
  selected: boolean
  onSelectPlanet?: (planetId: string) => void
}) {
  const [x, y, z] = position

  return (
    <group position={[x, y, z]}>
      <mesh
        onClick={(event) => {
          event.stopPropagation()
          onSelectPlanet?.(planet.id)
        }}
      >
        <sphereGeometry args={[planet.radius, 32, 32]} />
        <meshStandardMaterial
          color={planet.color}
          roughness={0.55}
          metalness={0.2}
          emissive={selected ? '#ffffff' : '#000000'}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
      <Text
        position={[0, planet.radius + 0.6, 0]}
        color={selected ? '#ffffff' : '#cfd8ff'}
        fontSize={0.36}
        anchorX="center"
        anchorY="middle"
      >
        {planet.name}
      </Text>
    </group>
  )
}

export function PlanetCanvas({ planets, links = [], selectedPlanetId, onSelectPlanet }: PlanetCanvasProps) {
  const positionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    planets.forEach((planet, index) => {
      map.set(planet.id, getOrbitPosition(index))
    })
    return map
  }, [planets])

  return (
    <Canvas camera={{ position: [0, 10, 18], fov: 50 }}>
      <color attach="background" args={['#040812']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 12, 8]} intensity={1.2} />
      <Stars radius={80} depth={30} count={2000} factor={4} saturation={0} fade speed={0.6} />
      {links.map((link, index) => {
        const source = positionMap.get(link.sourcePlanetId)
        const target = positionMap.get(link.targetPlanetId)
        if (!source || !target) return null

        return (
          <Line
            key={`${link.sourcePlanetId}-${link.targetPlanetId}-${index}`}
            points={[source, target]}
            color="#80b6ff"
            lineWidth={Math.min(3, 1 + link.strength * 0.4)}
            transparent
            opacity={0.55}
          />
        )
      })}
      {planets.map((planet) => (
        <PlanetNode
          key={planet.id}
          planet={planet}
          position={positionMap.get(planet.id) ?? [0, 0, 0]}
          selected={planet.id === selectedPlanetId}
          onSelectPlanet={onSelectPlanet}
        />
      ))}
      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  )
}
