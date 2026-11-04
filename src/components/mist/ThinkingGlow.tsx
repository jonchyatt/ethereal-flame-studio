'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { GlowMode, GlowPosition, GlowStyle } from './presets'
import { FluidSimulation, type FluidSettings } from './fluidSimulation'
import './ThinkingGlow.css'

export type ThinkingGlowProps = Readonly<{
  palette?: readonly string[]
  speed?: number
  intensity?: number
  height?: number
  grain?: number
  position?: GlowPosition
  mode?: GlowMode
  className?: string
  style?: GlowStyle
  containerStyle?: CSSProperties
}>

const DEFAULT_PALETTE = ['#1a2e5c', '#083820', '#56440f', '#3e264b', '#1a2e5c']
type GlowTestWindow = Window & {
  __GLOW_TEST_TIME__?: number
  __GLOW_TEST_ANSWER_AGE__?: number
  __GLOW_TEST_SOURCE__?: number
  __GLOW_TEST_TRACE__?: boolean
  __GLOW_TEST_SOURCES__?: ReturnType<FluidSimulation['sourceSnapshot']>
}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ThinkingGlow({
  palette = DEFAULT_PALETTE, speed = 0.25, intensity = 0.8, height = 0.74,
  grain = 0.2, position = 'bottom', mode = 'idle', className = '', style = 'mist', containerStyle,
}: ThinkingGlowProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const settingsRef = useRef<FluidSettings>({ palette, speed, intensity, height, grain, position, mode, style })
  const [webGlReady, setWebGlReady] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  settingsRef.current = { palette, speed, intensity, height, grain, position, mode, style }

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current
    if (!root || !canvas) return
    let fluid: FluidSimulation | null = null
    let frameId: number | null = null
    let lastTimestamp = 0
    let elapsed = 0
    let answerAge = 0
    let previousMode = settingsRef.current.mode
    let pageVisible = document.visibilityState === 'visible'
    let elementVisible = true
    let motionReduced = false
    let active = pageVisible
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateReducedMotion = () => {
      motionReduced = motionQuery.matches
      setReducedMotion(motionReduced)
    }
    updateReducedMotion()

    const render = (timestamp: number) => {
      frameId = null
      if (!active || !fluid) return
      const delta = lastTimestamp ? clamp((timestamp - lastTimestamp) / 1000, 0, 0.05) : 1 / 60
      lastTimestamp = timestamp
      const settings = settingsRef.current
      if (fluid.configure(settings)) elapsed = 0
      // Prepare a still initial state; toggling reduced motion holds the last dye.
      if (!motionReduced) elapsed += delta
      else elapsed = Math.max(elapsed, settings.style === 'vortex' ? 7 : 1.5)
      const test = window as GlowTestWindow
      const testTime = test.__GLOW_TEST_TIME__
      const seeking = Number.isFinite(testTime)
      if (seeking) fluid.setTraceSource(test.__GLOW_TEST_SOURCE__)
      const target = seeking ? Math.max(0, testTime as number) : elapsed
      fluid.advance(target, settings, seeking || motionReduced ? 30 : 4)
      if (settings.mode === 'answering') answerAge = previousMode === 'answering' ? answerAge + delta : 0
      else answerAge = 0
      previousMode = settings.mode
      const overrideAge = test.__GLOW_TEST_ANSWER_AGE__
      fluid.draw(settings, settings.mode === 'answering' ? (Number.isFinite(overrideAge) ? Math.max(0, overrideAge as number) : answerAge) : -1)
      if (seeking) {
        if (test.__GLOW_TEST_TRACE__) fluid.drawTrace()
        test.__GLOW_TEST_SOURCES__ = fluid.sourceSnapshot()
        root.dataset.fluidTime = fluid.time.toFixed(3)
      }
      if (active) frameId = requestAnimationFrame(render)
    }
    const updateActivity = () => {
      active = pageVisible && elementVisible
      setIsActive(active)
      if (!active && frameId !== null) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
      if (active && fluid && frameId === null) {
        lastTimestamp = 0
        frameId = requestAnimationFrame(render)
      }
    }
    const handleVisibility = () => {
      pageVisible = document.visibilityState === 'visible'
      updateActivity()
    }
    const resize = () => {
      if (!fluid) return
      const rect = root.getBoundingClientRect()
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5
      const width = Math.max(1, Math.floor(rect.width * scale))
      const pixelHeight = Math.max(1, Math.floor(rect.height * scale))
      if (canvas.width !== width || canvas.height !== pixelHeight) {
        canvas.width = width
        canvas.height = pixelHeight
        try { fluid.resize(width, pixelHeight); elapsed = fluid.time }
        catch { fluid.dispose(); fluid = null; setWebGlReady(false) }
      }
    }
    const init = () => {
      try {
        fluid = new FluidSimulation(canvas)
        // Force allocation even if the restored canvas has its previous size.
        const rect = root.getBoundingClientRect()
        const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5
        canvas.width = Math.max(1, Math.floor(rect.width * scale))
        canvas.height = Math.max(1, Math.floor(rect.height * scale))
        fluid.resize(canvas.width, canvas.height)
        elapsed = 0
        root.dataset.renderer = fluid.backend
        delete root.dataset.rendererError
        setWebGlReady(true)
        updateActivity()
      } catch (error) {
        root.dataset.rendererError = error instanceof Error ? error.message : 'Fluid initialization failed'
        fluid?.dispose()
        fluid = null
        setWebGlReady(false)
      }
    }
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      if (frameId !== null) cancelAnimationFrame(frameId)
      frameId = null
      fluid?.dispose()
      fluid = null
      setWebGlReady(false)
    }
    const observer = new IntersectionObserver(([entry]) => {
      elementVisible = entry?.isIntersecting ?? true
      updateActivity()
    }, { threshold: 0.01 })
    const resizeObserver = new ResizeObserver(resize)
    observer.observe(root)
    resizeObserver.observe(root)
    document.addEventListener('visibilitychange', handleVisibility)
    motionQuery.addEventListener?.('change', updateReducedMotion)
    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', init)
    init()
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      motionQuery.removeEventListener?.('change', updateReducedMotion)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', init)
      fluid?.dispose()
    }
  }, [])

  const fallbackPalette = palette.slice(0, 5)
  const fallbackStyle = {
    '--thinking-glow-intensity': clamp(intensity, 0, 1.5),
    '--thinking-glow-height': `${clamp(height, 0.2, 0.96) * 100}%`,
    '--thinking-glow-duration': `${Math.max(16, 42 / Math.max(0.04, speed))}s`,
  } as CSSProperties

  return (
    <div
      ref={rootRef}
      className={`thinking-glow-root ${className}`.trim()}
      style={containerStyle}
      data-style={style}
      data-active={isActive ? 'true' : 'false'}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-webgl={webGlReady ? 'true' : 'false'}
      data-position={position}
      data-mode={mode}
      aria-hidden="true"
    >
      <div className="thinking-glow-fallback" style={fallbackStyle}>
        {fallbackPalette.map((colour, index) => (
          <span
            key={`${colour}-${index}`}
            className="thinking-glow-field"
            style={{
              '--thinking-glow-color': colour,
              '--thinking-glow-index': index,
            } as CSSProperties}
          />
        ))}
      </div>
      <canvas ref={canvasRef} className="thinking-glow-canvas" />
    </div>
  )
}

export default ThinkingGlow
