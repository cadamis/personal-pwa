/**
 * The name-entry grid, in the spirit of the file-select screen it's copied
 * from: a board of letters you move a cursor over.
 *
 * A grid rather than an HTML text field because this game is played three ways.
 * A real input box gets a tablet's keyboard for free but leaves a gamepad with
 * no way to type at all, whereas a grid is driven identically by a thumb, a
 * stick and the arrow keys — and a physical keyboard can still just type, which
 * this also accepts.
 */
import Phaser from 'phaser'
import { P } from '../art/palette'
import { NAME_ALPHABET, NAME_MAX, normalizeName } from '../game/save'
import { drawPanel, textStyle } from './theme'

const BACKSPACE = '\b'

/** Four rows of ten, then the two controls. Space is shown as a visible box. */
const KEYS: string[][] = [
  'ABCDEFGHIJ'.split(''),
  'KLMNOPQRST'.split(''),
  'UVWXYZ0123'.split(''),
  ['4', '5', '6', '7', '8', '9', '-', "'", ' ', BACKSPACE],
]

interface Cell {
  key: string
  container: Phaser.GameObjects.Container
  background: Phaser.GameObjects.Graphics
  width: number
  height: number
}

export interface NameEntryOptions {
  x: number
  y: number
  width: number
  scale: number
  /**
   * What the grid starts with. The scene rebuilds this whole widget whenever
   * the window resizes or the player switches form, and without this the name
   * they had already typed would silently vanish each time.
   */
  initial?: string
  onChange: (name: string) => void
}

export class NameEntry {
  private cells: Cell[][] = []
  private objects: Phaser.GameObjects.GameObject[] = []
  private row = 0
  private col = 0
  private value: string

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: NameEntryOptions,
  ) {
    this.value = normalizeName(options.initial ?? '')
    this.build()
    this.bindKeyboard()
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy())
  }

  get name(): string {
    return this.value
  }

  /**
   * Height the grid will occupy, without having to build it first — so a scene
   * can measure its whole layout before placing anything.
   */
  static heightFor(width: number, scale: number): number {
    return KEYS.length * cellHeight(width, scale) + (KEYS.length - 1) * 6 * scale
  }

  /** Height the grid occupies, so the caller can lay out below it. */
  get height(): number {
    return NameEntry.heightFor(this.options.width, this.options.scale)
  }

  private cellWidth(): number {
    return cellWidth(this.options.width, this.options.scale)
  }

  private cellHeight(): number {
    return cellHeight(this.options.width, this.options.scale)
  }

  private build(): void {
    const { x, y, scale, onChange } = this.options
    const cw = this.cellWidth()
    const ch = this.cellHeight()
    const gap = 6 * scale

    KEYS.forEach((keyRow, r) => {
      const cells: Cell[] = []
      keyRow.forEach((key, c) => {
        const cx = x + c * (cw + gap) + cw / 2
        const cy = y + r * (ch + gap) + ch / 2
        const container = this.scene.add.container(cx, cy)
        const background = this.scene.add.graphics()
        container.add(background)

        const label = this.scene.add
          .text(0, 0, glyphFor(key), textStyle({ size: Math.min(22 * scale, ch * 0.5), bold: true }))
          .setOrigin(0.5)
        container.add(label)

        container.setSize(cw, ch)
        container.setInteractive(new Phaser.Geom.Rectangle(-cw / 2, -ch / 2, cw, ch), Phaser.Geom.Rectangle.Contains)
        container.on('pointerdown', () => {
          this.row = r
          this.col = c
          this.press(key)
          this.paint()
        })
        // Moving the cursor on hover keeps mouse and keyboard in agreement.
        container.on('pointerover', () => {
          this.row = r
          this.col = c
          this.paint()
        })

        this.objects.push(container)
        cells.push({ key, container, background, width: cw, height: ch })
      })
      this.cells.push(cells)
    })

    this.paint()
    onChange(this.value)
  }

  /** Cursor movement and selection, from keyboard or gamepad. */
  move(dx: number, dy: number): void {
    this.row = Phaser.Math.Wrap(this.row + dy, 0, KEYS.length)
    this.col = Phaser.Math.Wrap(this.col + dx, 0, KEYS[this.row].length)
    this.paint()
  }

  /** Types whatever the cursor is on. */
  select(): void {
    this.press(KEYS[this.row][this.col])
  }

  backspace(): void {
    this.press(BACKSPACE)
  }

  private press(key: string): void {
    if (key === BACKSPACE) {
      this.value = this.value.slice(0, -1)
    } else if (this.value.length < NAME_MAX) {
      // Normalising per keystroke stops a leading space from ever landing, so
      // the name shown is always exactly the name that gets saved.
      this.value = normalizeName(this.value + key)
    }
    this.options.onChange(this.value)
  }

  /**
   * Accepts a real keyboard too. Nothing about the grid stops someone with a
   * keyboard from just typing, and making them arrow around a letter board
   * would be a strange thing to insist on.
   */
  private bindKeyboard(): void {
    const keyboard = this.scene.input.keyboard
    if (!keyboard) return
    keyboard.on('keydown', this.onKeyDown, this)
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      event.preventDefault()
      this.press(BACKSPACE)
      return
    }
    if (event.key.length !== 1) return
    const ch = event.key.toUpperCase()
    if (!NAME_ALPHABET.includes(ch)) return
    // Space would otherwise also trip the scene's "confirm" binding.
    if (ch === ' ') event.preventDefault()
    this.press(ch)
  }

  private paint(): void {
    this.cells.forEach((cells, r) => {
      cells.forEach((cell, c) => {
        const active = r === this.row && c === this.col
        cell.background.clear()
        drawPanel(cell.background, -cell.width / 2, -cell.height / 2, cell.width, cell.height, {
          fill: active ? P.nightSoft : P.panel,
          edge: active ? P.eyeGold : P.panelEdge,
          radius: 8,
          alpha: 0.95,
        })
      })
    })
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.onKeyDown, this)
    for (const object of this.objects) object.destroy()
    this.objects = []
    this.cells = []
  }
}

function cellWidth(width: number, scale: number): number {
  return (width - 9 * 6 * scale) / 10
}

function cellHeight(width: number, scale: number): number {
  return Math.max(30 * scale, cellWidth(width, scale) * 0.82)
}

function glyphFor(key: string): string {
  if (key === BACKSPACE) return '⌫'
  if (key === ' ') return '␣'
  return key
}
