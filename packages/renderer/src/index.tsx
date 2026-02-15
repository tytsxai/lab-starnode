'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line, OrbitControls, Stars, Text, Float } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanetLink, PlanetViewModel } from '@starnode/core'

interface PlanetCanvasProps {
  planets: PlanetViewModel[]
  links?: PlanetLink[]
  selectedPlanetId?: string
  onSelectPlanet?: (planetId: string) => void
}

function getOrbitPosition(index: number): [number, number, number] {
  // Spiral layout to avoid overlap and look cool
  const angle = index * 2.4 // Golden angle-ish
  const radius = 6 + index * 1.5
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  return [x, 0, z]
}

function Atmosphere({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.2, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.15}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
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
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002
    }
  })

  useEffect(() => {
    return () => {
      // 防御性清理：若组件在 hover 期间卸载，确保鼠标样式恢复。
      document.body.style.cursor = 'auto'
    }
  }, [])

  // Determine color based on stage/health
  const baseColor = new THREE.Color(planet.color)
  const emissiveColor = selected ? '#ffffff' : baseColor

  return (
    <group position={[x, y, z]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group
          onClick={(event) => {
            event.stopPropagation()
            onSelectPlanet?.(planet.id)
          }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          {/* Core Planet */}
          <mesh ref={meshRef}>
            <sphereGeometry args={[planet.radius, 64, 64]} />
            <meshPhysicalMaterial
              color={baseColor}
              roughness={0.7}
              metalness={0.1}
              emissive={emissiveColor}
              emissiveIntensity={selected ? 0.3 : 0.05}
              clearcoat={0.3}
              clearcoatRoughness={0.2}
            />
          </mesh>

          {/* Atmosphere Glow */}
          <Atmosphere radius={planet.radius} color={planet.color} />

          {/* Selection Ring */}
          {selected && (
            <mesh rotation-x={Math.PI / 2}>
              <ringGeometry args={[planet.radius * 1.4, planet.radius * 1.45, 64]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
          )}

          {/* Label */}
          <Text
            position={[0, planet.radius + 1.2, 0]}
            color={selected ? '#ffffff' : '#a0aec0'}
            fontSize={selected ? 0.6 : 0.45}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {planet.name}
          </Text>
          <Text
            position={[0, planet.radius + 0.7, 0]}
            color={selected ? '#cbd5e0' : '#718096'}
            fontSize={0.25}
            anchorX="center"
            anchorY="middle"
          >
            {planet.noteCount} 信号
          </Text>
        </group>
      </Float>
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
    <Canvas camera={{ position: [0, 20, 30], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#02040a']} />

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" distance={50} decay={2} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#a5b4fc" />
      <fog attach="fog" args={['#02040a', 20, 90]} />

      {/* Environment */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0.5} fade speed={0.5} />

      {/* Links */}
      {links.map((link) => {
        const source = positionMap.get(link.sourcePlanetId)
        const target = positionMap.get(link.targetPlanetId)
        if (!source || !target) return null

        return (
          <Line
            key={`${link.sourcePlanetId}-${link.targetPlanetId}`}
            points={[source, target]}
            color="#3b82f6"
            lineWidth={0.8}
            transparent
            opacity={0.15}
            dashed={false}
          />
        )
      })}

      {/* Planets */}
      {planets.map((planet) => (
        <PlanetNode
          key={planet.id}
          planet={planet}
          position={positionMap.get(planet.id) ?? [0, 0, 0]}
          selected={planet.id === selectedPlanetId}
          onSelectPlanet={onSelectPlanet}
        />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={80}
        zoomSpeed={0.8}
        rotateSpeed={0.6}
      />
    </Canvas>
  )
}
