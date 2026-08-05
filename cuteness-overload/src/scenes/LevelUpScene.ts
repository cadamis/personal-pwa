import Phaser from 'phaser'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import type { Choice } from '../game/upgradePool'
import { uiScale } from '../ui/layout'
import { drawPanel, textStyle } from '../ui/theme'

interface LevelUpData {
  level: number
  choices: Choice[]
  onPick: (choice: Choice) => void
}

/**
 * The level-up picker, shown over a paused game. Cards fill a single row or
 * column so three or four of them fit whichever way the tablet is held.
 */
export class LevelUpScene extends Phaser.Scene {
  private payload!: LevelUpData
  private picked = false

  constructor() {
    super('LevelUp')
  }

  init(data: LevelUpData): void {
    this.payload = data
    this.picked = false
  }

  create(): void {
    const w = this.scale.width
    const h = this.scale.height
    const s = uiScale(this)

    const dim = this.add.graphics()
    dim.fillStyle(P.night, 0.72)
    dim.fillRect(0, 0, w, h)

    const title = this.add
      .text(w / 2, 16 * s, `LEVEL ${this.payload.level}!`, textStyle({ size: 42 * s, color: P.lemon, stroke: P.ink, strokeWidth: 7 * s, bold: true }))
      .setOrigin(0.5, 0)
    this.add
      .text(w / 2, 62 * s, 'Pick your treat', textStyle({ size: 20 * s, color: P.pink }))
      .setOrigin(0.5, 0)
    this.tweens.add({ targets: title, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const top = 96 * s
    const pad = 16 * s
    const gap = 12 * s
    const areaW = w - pad * 2
    const areaH = h - top - pad
    const count = this.payload.choices.length
    // One row in landscape, one column in portrait. A grid would leave a lone
    // card stranded on a second row, and these are meant to be compared at a
    // glance.
    const cols = w > h ? count : 1
    const rows = Math.ceil(count / cols)
    const cellW = (areaW - gap * (cols - 1)) / cols
    const cellH = (areaH - gap * (rows - 1)) / rows

    this.payload.choices.forEach((choice, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = pad + col * (cellW + gap)
      const y = top + row * (cellH + gap)
      this.makeCard(choice, x, y, cellW, cellH, s)
    })
  }

  private makeCard(choice: Choice, x: number, y: number, w: number, h: number, s: number): void {
    const tall = h > w
    const card = this.add.container(x + w / 2, y + h / 2)
    const g = this.add.graphics()
    const isNew = choice.tag === 'NEW!'
    drawPanel(g, -w / 2, -h / 2, w, h, {
      fill: P.panel,
      edge: isNew ? P.gold : P.panelEdge,
      radius: 20 * s,
    })
    card.add(g)

    const iconSize = tall ? Math.min(w * 0.42, 64 * s) : Math.min(h * 0.6, 74 * s)
    const iconX = tall ? 0 : -w / 2 + iconSize * 0.75
    const iconY = tall ? -h * 0.2 : 0
    card.add(this.add.text(iconX, iconY, choice.icon, textStyle({ size: iconSize })).setOrigin(0.5))

    const textX = tall ? 0 : iconX + iconSize * 0.75
    const textW = tall ? w * 0.86 : w - (textX + w / 2) - 16 * s
    const align = tall ? 'center' : 'left'
    const originX = tall ? 0.5 : 0

    card.add(
      this.add
        .text(textX, tall ? h * 0.03 : -h * 0.22, choice.title, textStyle({ size: Math.min(24 * s, h * 0.16), color: P.purple, bold: true, align, wrap: textW }))
        .setOrigin(originX, 0.5),
    )
    if (choice.tag) {
      card.add(
        this.add
          .text(textX, tall ? h * 0.15 : -h * 0.02, choice.tag, textStyle({ size: Math.min(17 * s, h * 0.12), color: isNew ? P.gold : P.teal, bold: true, align }))
          .setOrigin(originX, 0.5),
      )
    }
    card.add(
      this.add
        .text(textX, tall ? h * 0.31 : h * 0.2, choice.desc, textStyle({ size: Math.min(17 * s, h * 0.11), color: P.ink, align, wrap: textW }))
        .setOrigin(originX, 0.5),
    )

    card.setSize(w, h)
    card.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
    card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.pick(choice, card))

    this.tweens.add({
      targets: card,
      scale: { from: 0.85, to: 1 },
      duration: 220,
      ease: 'Back.easeOut',
    })
  }

  private pick(choice: Choice, card: Phaser.GameObjects.Container): void {
    if (this.picked) return
    this.picked = true
    sfx.play('coin', 0)
    this.tweens.add({
      targets: card,
      scale: 1.12,
      duration: 110,
      yoyo: true,
      onComplete: () => {
        const onPick = this.payload.onPick
        this.scene.stop()
        onPick(choice)
      },
    })
  }
}
