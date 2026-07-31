import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { render } from '../game/renderer.js'
import { tick } from '../game/gameLoop.js'
import { CANVAS_W, CANVAS_H } from '../game/constants.js'

// Cap the backing store so a DPR-3 device doesn't allocate a needlessly huge
// buffer. Beyond 2x the sharpness gain is imperceptible at this art style.
const MAX_PIXEL_RATIO = 2

export default function GameCanvas() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)

  const [pixelRatio, setPixelRatio] = useState(
    () => Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO),
  )
  const [fontsReady, setFontsReady] = useState(false)

  const customers      = useGameStore(s => s.customers)
  const tableOccupancy = useGameStore(s => s.tableOccupancy)
  const gameTime       = useGameStore(s => s.gameTime)
  const dayRunning     = useGameStore(s => s.dayRunning)
  const dayEnded       = useGameStore(s => s.dayEnded)

  // Game loop
  useEffect(() => {
    const store = useGameStore

    function loop(timestamp) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp
      }
      const deltaMs = Math.min(timestamp - lastTimeRef.current, 100)
      lastTimeRef.current = timestamp

      try {
        tick(deltaMs, store)
      } catch (err) {
        console.error('[Teabug] tick error:', err)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = null
    }
  }, [])

  // The canvas draws its labels in Playfair Display / Lato. Web fonts are not
  // guaranteed to be loaded on first paint, and canvas text silently falls back
  // to a generic face rather than restyling itself later — so redraw once the
  // fonts actually land.
  useEffect(() => {
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) setFontsReady(true)
    })
    return () => { cancelled = true }
  }, [])

  // Follow devicePixelRatio across display changes and browser zoom.
  useEffect(() => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    const onChange = () =>
      setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pixelRatio])

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Size the backing store to physical pixels so the art is sharp on retina
    // tablets; the renderer keeps drawing in logical CANVAS_W/CANVAS_H units.
    const bufferW = Math.round(CANVAS_W * pixelRatio)
    const bufferH = Math.round(CANVAS_H * pixelRatio)
    if (canvas.width !== bufferW || canvas.height !== bufferH) {
      canvas.width = bufferW
      canvas.height = bufferH
    }

    const ctx = canvas.getContext('2d')
    // Resizing the canvas resets context state, so (re)apply the scale here.
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    try {
      render(ctx, {
        customers,
        tableOccupancy,
        gameTimeMinutes: gameTime,
        dayRunning,
        dayEnded,
      })
    } catch (err) {
      console.error('[Teabug] render error:', err)
    }
  }, [customers, tableOccupancy, gameTime, dayRunning, dayEnded, pixelRatio, fontsReady])

  return (
    <div className="canvas-wrapper">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  )
}
