import Phaser from 'phaser'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import type { Choice } from '../game/upgradePool'
import { Button } from '../ui/Button'
import { uiScale } from '../ui/layout'
import { drawCard, textStyle } from '../ui/theme'

interface LevelUpData {
  level: number
  choices: Choice[]
  rerolls: number
  banishes: number
  onPick: (choice: Choice) => void
  /** Returns a fresh hand, or null if there are no rerolls left. */
  onReroll: () => Choice[] | null
  /** Banishes `choice` for the rest of the run and returns its replacement. */
  onBanish: (choice: Choice, showing: readonly Choice[]) => Choice | null
}

/**
 * The level-up picker, shown over a paused game. Cards fill a single row or
 * column so three or four of them fit whichever way the tablet is held.
 *
 * Underneath sit the two helpers from the shop, when you have any: reroll the
 * whole hand, or say "no thanks" to one card so it never comes back this run.
 */
export class LevelUpScene extends Phaser.Scene {
  private payload!: LevelUpData
  private picked = false
  private choices: Choice[] = []
  private rerolls = 0
  private banishes = 0
  private banishMode = false
  private root!: Phaser.GameObjects.Container

  constructor() {
    super('LevelUp')
  }

  init(data: LevelUpData): void {
    this.payload = data
    this.picked = false
    this.choices = [...data.choices]
    this.rerolls = data.rerolls
    this.banishes = data.banishes
    this.banishMode = false
  }

  create(): void {
    const w = this.scale.width
    const h = this.scale.height
    const dim = this.add.graphics()
    dim.fillStyle(P.night, 0.74)
    dim.fillRect(0, 0, w, h)
    this.root = this.add.container(0, 0)
    this.build(true)
  }

  private build(animate: boolean): void {
    this.root.removeAll(true)
    const w = this.scale.width
    const h = this.scale.height
    const s = uiScale(this)
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.root.add(obj)
      return obj
    }

    const title = add(
      this.add
        .text(w / 2, 14 * s, `LEVEL ${this.payload.level}!`, textStyle({ size: 42 * s, color: P.lemon, stroke: P.ink, strokeWidth: 7 * s, bold: true }))
        .setOrigin(0.5, 0),
    )
    add(
      this.add
        .text(
          w / 2,
          60 * s,
          this.banishMode ? 'Tap the card you never want to see again' : 'Pick your treat',
          textStyle({ size: 20 * s, color: this.banishMode ? P.coral : P.pink, bold: this.banishMode }),
        )
        .setOrigin(0.5, 0),
    )
    if (animate) this.tweens.add({ targets: title, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const helpers = this.rerolls > 0 || this.banishes > 0
    const footer = helpers ? 64 * s : 0
    const top = 92 * s
    const pad = 16 * s
    const gap = 12 * s
    const areaW = w - pad * 2
    const areaH = h - top - pad - footer
    const count = this.choices.length
    // One row in landscape, one column in portrait. A grid would leave a lone
    // card stranded on a second row, and these are meant to be compared at a
    // glance.
    const cols = w > h ? count : 1
    const rows = Math.ceil(count / cols)
    const cellW = (areaW - gap * (cols - 1)) / cols
    const cellH = Math.min((areaH - gap * (rows - 1)) / rows, cols === 1 ? 170 * s : Infinity)
    const usedH = cellH * rows + gap * (rows - 1)
    const startY = top + Math.max(0, (areaH - usedH) / 2)

    this.choices.forEach((choice, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = pad + col * (cellW + gap)
      const y = startY + row * (cellH + gap)
      add(this.makeCard(choice, i, x, y, cellW, cellH, s, animate))
    })

    if (helpers) {
      const btnH = 48 * s
      const btnW = Math.min(230 * s, (w - pad * 3) / 2)
      const y = h - pad - btnH / 2
      const buttons: Button[] = []
      if (this.rerolls > 0) {
        buttons.push(
          new Button(this, 0, y, {
            label: `🎲 Reroll ×${this.rerolls}`,
            width: btnW,
            height: btnH,
            fill: P.sky,
            fontSize: 20 * s,
            onClick: () => this.reroll(),
          }),
        )
      }
      if (this.banishes > 0) {
        buttons.push(
          new Button(this, 0, y, {
            label: this.banishMode ? 'Never mind' : `🙅 No thanks ×${this.banishes}`,
            width: btnW,
            height: btnH,
            fill: this.banishMode ? P.grumpGrey : P.coral,
            fontSize: 20 * s,
            onClick: () => {
              this.banishMode = !this.banishMode
              this.build(false)
            },
          }),
        )
      }
      buttons.forEach((button, i) => {
        button.x = w / 2 + (i - (buttons.length - 1) / 2) * (btnW + gap)
        add(button)
      })
    }
  }

  private makeCard(
    choice: Choice,
    index: number,
    x: number,
    y: number,
    w: number,
    h: number,
    s: number,
    animate: boolean,
  ): Phaser.GameObjects.Container {
    const tall = h > w
    const card = this.add.container(x + w / 2, y + h / 2)
    const g = this.add.graphics()
    const isNew = choice.tag === 'NEW!'
    const isMax = choice.tag === 'MAX!'
    drawCard(g, -w / 2, -h / 2, w, h, {
      fill: this.banishMode ? 0xffeef0 : P.panel,
      edge: this.banishMode ? P.coral : isMax ? P.pinkHot : isNew ? P.gold : P.panelEdge,
      radius: 20 * s,
      glow: isNew || isMax,
    })
    card.add(g)

    const iconSize = tall ? Math.min(w * 0.36, 58 * s) : Math.min(h * 0.46, 64 * s)
    const iconX = tall ? 0 : -w / 2 + iconSize * 0.8
    const iconY = tall ? -h * 0.26 : 0
    // A soft disc behind the icon so emoji of every colour sit on the same ground.
    const disc = this.add.graphics()
    disc.fillStyle(isNew ? P.lemon : P.pink, 0.45)
    disc.fillCircle(iconX, iconY, iconSize * 0.68)
    card.add(disc)
    card.add(this.add.text(iconX, iconY, choice.icon, textStyle({ size: iconSize })).setOrigin(0.5))

    const textX = tall ? 0 : iconX + iconSize * 0.85
    const textW = tall ? w * 0.88 : w - (textX + w / 2) - 14 * s
    const align = tall ? 'center' : 'left'
    const originX = tall ? 0.5 : 0
    const titleSize = Math.min(24 * s, (tall ? h : h) * 0.15)

    const titleY = tall ? h * 0.02 : -h * 0.26
    card.add(
      this.add
        .text(textX, titleY, choice.title, textStyle({ size: titleSize, color: P.purple, bold: true, align, wrap: textW }))
        .setOrigin(originX, 0.5),
    )
    if (choice.tag) {
      card.add(
        this.add
          .text(textX, tall ? h * 0.13 : -h * 0.07, choice.tag, textStyle({ size: Math.min(16 * s, h * 0.11), color: isMax ? P.pinkHot : isNew ? P.gold : P.teal, bold: true, align }))
          .setOrigin(originX, 0.5),
      )
    }
    card.add(
      this.add
        .text(textX, tall ? h * 0.27 : h * 0.12, choice.desc, textStyle({ size: Math.min(16 * s, h * 0.1), color: P.ink, align, wrap: textW }))
        .setOrigin(originX, 0.5),
    )
    if (choice.hint) {
      card.add(
        this.add
          .text(textX, tall ? h * 0.41 : h * 0.34, choice.hint, textStyle({ size: Math.min(13 * s, h * 0.085), color: P.teal, bold: true, align, wrap: textW }))
          .setOrigin(originX, 0.5),
      )
    }

    card.setSize(w, h)
    card.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
    card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (this.banishMode) this.banish(index)
      else this.pick(choice, card)
    })

    if (animate) {
      card.setScale(0.85)
      this.tweens.add({ targets: card, scale: 1, duration: 220, delay: index * 40, ease: 'Back.easeOut' })
    }
    if (this.banishMode) {
      this.tweens.add({ targets: card, angle: { from: -1.2, to: 1.2 }, duration: 160, yoyo: true, repeat: -1 })
    }
    return card
  }

  private reroll(): void {
    if (this.picked) return
    const fresh = this.payload.onReroll()
    if (!fresh) return
    this.rerolls -= 1
    this.banishMode = false
    this.choices = fresh
    sfx.play('coin', 0)
    this.build(true)
  }

  private banish(index: number): void {
    if (this.picked) return
    const replacement = this.payload.onBanish(this.choices[index], this.choices)
    if (!replacement) return
    this.banishes -= 1
    this.banishMode = false
    this.choices[index] = replacement
    sfx.play('pop', 0)
    this.build(false)
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
