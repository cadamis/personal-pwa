/**
 * Creates a mock Canvas 2D rendering context.
 * All methods are recorded as vi.fn() so you can assert call counts.
 * Setter-style properties (fillStyle, etc.) are plain writable values.
 */
export function createMockCtx() {
  const ctx = {
    // ─── State properties ────────────────────────────────────────────────────
    fillStyle:    '#000',
    strokeStyle:  '#000',
    lineWidth:    1,
    font:         '10px sans-serif',
    textAlign:    'left',
    textBaseline: 'alphabetic',
    globalAlpha:  1,

    // ─── Path API ────────────────────────────────────────────────────────────
    beginPath:          vi.fn(),
    closePath:          vi.fn(),
    moveTo:             vi.fn(),
    lineTo:             vi.fn(),
    arc:                vi.fn(),
    ellipse:            vi.fn(),
    rect:               vi.fn(),
    roundRect:          vi.fn(),
    quadraticCurveTo:   vi.fn(),
    bezierCurveTo:      vi.fn(),

    // ─── Draw API ────────────────────────────────────────────────────────────
    fill:               vi.fn(),
    stroke:             vi.fn(),
    fillRect:           vi.fn(),
    strokeRect:         vi.fn(),
    clearRect:          vi.fn(),
    fillText:           vi.fn(),
    strokeText:         vi.fn(),
    measureText:        vi.fn(() => ({ width: 60 })),
    drawImage:          vi.fn(),

    // ─── State API ───────────────────────────────────────────────────────────
    save:               vi.fn(),
    restore:            vi.fn(),
    translate:          vi.fn(),
    scale:              vi.fn(),
    rotate:             vi.fn(),
    setTransform:       vi.fn(),
    clip:               vi.fn(),
  }
  return ctx
}
