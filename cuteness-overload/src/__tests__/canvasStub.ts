/**
 * A no-op 2D canvas context for tests.
 *
 * jsdom ships `<canvas>` but no rendering context, and both the sprite painters
 * and Phaser's Text objects call into one. Rather than pull in a native canvas
 * binding just to run logic tests, this hands back a proxy that swallows every
 * drawing call and returns plausible values for the few methods whose result is
 * actually used.
 */
export function installCanvasStub(): void {
  const measure = (text: string): TextMetrics =>
    ({
      width: text.length * 8,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 8,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 3,
    }) as TextMetrics

  const makeContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
    const base: Record<string, unknown> = {
      canvas,
      measureText: measure,
      createLinearGradient: () => ({ addColorStop: () => undefined }),
      createRadialGradient: () => ({ addColorStop: () => undefined }),
      createPattern: () => null,
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(Math.max(4, Math.abs(w * h * 4))),
        width: Math.abs(w) || 1,
        height: Math.abs(h) || 1,
        colorSpace: 'srgb',
      }),
      getContextAttributes: () => ({ alpha: true, willReadFrequently: false }),
    }

    return new Proxy(base, {
      get(target, prop) {
        if (prop in target) return target[prop as string]
        // Everything else is a drawing call or a style property being read back.
        return typeof prop === 'string' && /^[a-z]/.test(prop) ? () => undefined : undefined
      },
      set(target, prop, value) {
        target[prop as string] = value
        return true
      },
    }) as unknown as CanvasRenderingContext2D
  }

  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()

  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement): CanvasRenderingContext2D {
    let ctx = contexts.get(this)
    if (!ctx) {
      ctx = makeContext(this)
      contexts.set(this, ctx)
    }
    return ctx
  } as unknown as HTMLCanvasElement['getContext']

  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,'
}

/**
 * A fake `Image` that reports success as soon as a `src` is set.
 *
 * Phaser's TextureManager boots by decoding three base64 images and only emits
 * `ready` once they've all loaded. jsdom can't decode images without a native
 * canvas binding, so without this the game never finishes booting and a test
 * just times out with no output.
 */
export function installImageStub(): void {
  class FakeImage {
    width = 32
    height = 32
    naturalWidth = 32
    naturalHeight = 32
    complete = true
    crossOrigin: string | null = null
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    private listeners = new Map<string, (() => void)[]>()
    private source = ''

    get src(): string {
      return this.source
    }

    set src(value: string) {
      this.source = value
      // Asynchronous, like the real thing, so Phaser's handlers are attached first.
      setTimeout(() => {
        this.onload?.()
        for (const fn of this.listeners.get('load') ?? []) fn()
      }, 0)
    }

    addEventListener(type: string, fn: () => void): void {
      const list = this.listeners.get(type) ?? []
      list.push(fn)
      this.listeners.set(type, list)
    }

    removeEventListener(type: string, fn: () => void): void {
      const list = (this.listeners.get(type) ?? []).filter((f) => f !== fn)
      this.listeners.set(type, list)
    }
  }

  ;(globalThis as unknown as { Image: unknown }).Image = FakeImage
}
