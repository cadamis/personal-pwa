import { vi } from 'vitest'
import type { RenderCtx } from '../game/renderer'

/**
 * A mock Canvas 2D rendering context covering exactly the surface the renderer
 * uses. All methods are vi.fn() so tests can assert call counts.
 *
 * Typed as RenderCtx so the two cannot drift: if the renderer starts calling a
 * new context method, RenderCtx grows and this mock fails to compile until it
 * is updated.
 */
export function createMockCtx(): RenderCtx {
  const ctx: RenderCtx = {
    // ─── State properties ────────────────────────────────────────────────────
    fillStyle:   '#000',
    strokeStyle: '#000',
    lineWidth:   1,
    font:        '10px sans-serif',
    textAlign:   'left',

    // ─── Path API ────────────────────────────────────────────────────────────
    beginPath:        vi.fn(),
    closePath:        vi.fn(),
    moveTo:           vi.fn(),
    lineTo:           vi.fn(),
    arc:              vi.fn(),
    ellipse:          vi.fn(),
    roundRect:        vi.fn(),
    quadraticCurveTo: vi.fn(),

    // ─── Draw API ────────────────────────────────────────────────────────────
    fill:        vi.fn(),
    stroke:      vi.fn(),
    fillRect:    vi.fn(),
    strokeRect:  vi.fn(),
    clearRect:   vi.fn(),
    fillText:    vi.fn(),
    measureText: vi.fn(() => ({ width: 60 })),
  }
  return ctx
}
