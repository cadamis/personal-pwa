import Phaser from 'phaser'
import { ART_SCALE } from '../art/textures'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { PASSIVES } from '../data/passives'
import { WEAPONS, maxWeaponLevel } from '../data/weapons'
import type { ChestPrize } from '../game/upgradePool'
import { Button } from '../ui/Button'
import { uiScale } from '../ui/layout'
import { drawCard, textStyle } from '../ui/theme'

interface ChestData {
  prizes: readonly ChestPrize[]
  boss: boolean
  sprinkles: number
  onDone: () => void
}

interface PrizeView {
  icon: string
  title: string
  tag: string
  evolve: boolean
  /** Painted art to show big, for evolutions. */
  art?: string
}

function describe(prize: ChestPrize): PrizeView {
  switch (prize.kind) {
    case 'evolve': {
      const into = WEAPONS[prize.into]
      return { icon: `${WEAPONS[prize.from].icon}➜${into.icon}`, title: into.name, tag: 'EVOLVED!', evolve: true, art: into.texture }
    }
    case 'weapon': {
      const def = WEAPONS[prize.id]
      return { icon: def.icon, title: def.name, tag: prize.nextLevel >= maxWeaponLevel(prize.id) ? 'MAX!' : `Lv ${prize.nextLevel}`, evolve: false }
    }
    case 'passive': {
      const def = PASSIVES[prize.id]
      return { icon: def.icon, title: def.name, tag: `Lv ${prize.nextLevel}`, evolve: false }
    }
    case 'sprinkles':
      return { icon: '🍬', title: 'Sprinkles', tag: `+${prize.amount}`, evolve: false }
  }
}

/**
 * Opening a treasure chest. The whole point is the anticipation: the chest
 * drops in, wobbles, bursts open in a spray of light, and the prizes pop out
 * one at a time. An evolution gets the full fanfare. A tap skips to the end,
 * because by the fortieth chest a child knows how it goes.
 */
export class ChestScene extends Phaser.Scene {
  private payload!: ChestData
  private done = false
  private revealed = 0
  private skipping = false
  private cards: Phaser.GameObjects.Container[] = []
  private finishButton?: Button

  constructor() {
    super('Chest')
  }

  init(data: ChestData): void {
    this.payload = data
    this.done = false
    this.revealed = 0
    this.skipping = false
    this.cards = []
    this.finishButton = undefined
  }

  create(): void {
    const w = this.scale.width
    const h = this.scale.height
    const s = uiScale(this)
    const dim = this.add.graphics()
    dim.fillStyle(P.night, 0.8)
    dim.fillRect(0, 0, w, h)

    const chestY = h * 0.3
    const rays = this.add.image(w / 2, chestY, 'fx-rays').setScale(0).setTint(P.gold).setAlpha(0)
    const chest = this.add.image(w / 2, -80, 'pick-chest', 0).setScale(ART_SCALE * 4.2 * s)
    const title = this.add
      .text(w / 2, 16 * s, this.payload.boss ? 'BOSS TREASURE!' : 'Treasure!', textStyle({ size: 40 * s, color: P.lemon, stroke: P.ink, strokeWidth: 7 * s, bold: true }))
      .setOrigin(0.5, 0)
      .setAlpha(0)

    this.tweens.add({ targets: title, alpha: 1, duration: 300 })
    // Drop in and bounce...
    this.tweens.add({
      targets: chest,
      y: chestY,
      duration: 520,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        // ...wobble with excitement...
        this.tweens.add({
          targets: chest,
          angle: { from: -8, to: 8 },
          duration: 90,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            chest.setAngle(0).setFrame(1)
            // ...and burst open.
            sfx.play('chest', 0)
            this.cameras.main.flash(200, 255, 245, 200)
            rays.setAlpha(0.9)
            this.tweens.add({ targets: rays, scale: ART_SCALE * 5 * s, duration: 380, ease: 'Back.easeOut' })
            this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 })
            this.tweens.add({ targets: chest, scale: chest.scale * 1.15, duration: 150, yoyo: true })
            const burst = this.add.particles(w / 2, chestY, 'fx-star', {
              speed: { min: 120, max: 360 },
              lifespan: 900,
              scale: { start: ART_SCALE * 1.6, end: 0 },
              rotate: { start: 0, end: 360 },
              quantity: 30,
              emitting: false,
            })
            burst.explode(30)
            this.time.delayedCall(300, () => this.revealNext())
          },
        })
      },
    })

    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.finishButton) return
      this.skipping = true
      while (this.revealed < this.payload.prizes.length) this.showPrize(this.revealed++, false)
      this.showFinish()
    })
  }

  private layout(index: number): { x: number; y: number; w: number; h: number } {
    const w = this.scale.width
    const h = this.scale.height
    const s = uiScale(this)
    const n = this.payload.prizes.length
    const top = h * 0.5
    const bottom = h - 90 * s
    const cols = n <= 1 ? 1 : n <= 3 ? n : 3
    const rows = Math.ceil(n / cols)
    const gap = 10 * s
    const cardW = Math.min(230 * s, (w - 32 * s - gap * (cols - 1)) / cols)
    const cardH = Math.min(110 * s, (bottom - top - gap * (rows - 1)) / rows)
    const row = Math.floor(index / cols)
    const inRow = Math.min(cols, n - row * cols)
    const col = index % cols
    const x = w / 2 + (col - (inRow - 1) / 2) * (cardW + gap)
    const y = top + row * (cardH + gap) + cardH / 2
    return { x, y, w: cardW, h: cardH }
  }

  private revealNext(): void {
    if (this.skipping || this.revealed >= this.payload.prizes.length) {
      if (!this.skipping) this.showFinish()
      return
    }
    const index = this.revealed++
    const evolve = this.payload.prizes[index].kind === 'evolve'
    this.showPrize(index, true)
    this.time.delayedCall(evolve ? 1100 : 420, () => this.revealNext())
  }

  private showPrize(index: number, animate: boolean): void {
    const view = describe(this.payload.prizes[index])
    const s = uiScale(this)
    const { x, y, w, h } = this.layout(index)
    const card = this.add.container(x, y)
    const g = this.add.graphics()
    drawCard(g, -w / 2, -h / 2, w, h, {
      fill: view.evolve ? 0xfff4d6 : P.panel,
      edge: view.evolve ? P.gold : P.panelEdge,
      radius: 18 * s,
      glow: view.evolve,
    })
    card.add(g)
    const iconSize = Math.min(h * 0.5, 44 * s)
    if (view.art && this.textures.exists(view.art)) {
      const art = this.add.image(-w / 2 + iconSize * 0.9, 0, view.art, 0)
      const frame = art.frame
      art.setScale(Math.min((iconSize * 1.5) / frame.width, (h * 0.8) / frame.height))
      card.add(art)
    } else {
      card.add(this.add.text(-w / 2 + iconSize * 0.9, 0, view.icon, textStyle({ size: iconSize })).setOrigin(0.5))
    }
    const textX = -w / 2 + iconSize * 1.9
    card.add(
      this.add
        .text(textX, -h * 0.16, view.title, textStyle({ size: Math.min(20 * s, h * 0.22), color: P.purple, bold: true, align: 'left', wrap: w - iconSize * 2.1 }))
        .setOrigin(0, 0.5),
    )
    card.add(
      this.add
        .text(textX, h * 0.2, view.evolve ? `✨ ${view.tag} ✨` : view.tag, textStyle({ size: Math.min(18 * s, h * 0.2), color: view.evolve ? P.pinkHot : P.teal, bold: true, align: 'left' }))
        .setOrigin(0, 0.5),
    )
    this.cards.push(card)

    if (!animate) return
    card.setScale(0.2).setAlpha(0)
    card.y = this.scale.height * 0.3
    this.tweens.add({ targets: card, scale: 1, alpha: 1, y, duration: 380, ease: 'Back.easeOut' })
    if (view.evolve) {
      sfx.play('evolve', 0)
      this.cameras.main.shake(220, 0.006)
      const banner = this.add
        .text(this.scale.width / 2, this.scale.height * 0.44, 'EVOLUTION!', textStyle({ size: 44 * s, color: P.pinkHot, stroke: P.white, strokeWidth: 8 * s, bold: true }))
        .setOrigin(0.5)
        .setScale(0.4)
      this.tweens.add({ targets: banner, scale: 1, duration: 360, ease: 'Back.easeOut' })
      this.tweens.add({ targets: banner, alpha: 0, delay: 1000, duration: 400, onComplete: () => banner.destroy() })
    } else {
      sfx.play('coin', 0)
    }
  }

  private showFinish(): void {
    if (this.finishButton) return
    const w = this.scale.width
    const h = this.scale.height
    const s = uiScale(this)
    this.add
      .text(w / 2, h - 84 * s, `+🍬 ${this.payload.sprinkles}`, textStyle({ size: 22 * s, color: P.lemon, stroke: P.ink, strokeWidth: 4 * s, bold: true }))
      .setOrigin(0.5)
    this.finishButton = new Button(this, w / 2, h - 40 * s, {
      label: 'Yay!',
      width: Math.min(220 * s, w * 0.5),
      height: 52 * s,
      fill: P.pink,
      fontSize: 26 * s,
      onClick: () => this.finish(),
    })
    this.finishButton.setScale(0.6)
    // Briefly unclickable, so the tap that skipped the reveal can't also land on it.
    this.finishButton.setEnabled(false)
    this.time.delayedCall(350, () => this.finishButton?.setEnabled(true))
    this.tweens.add({ targets: this.finishButton, scale: 1, duration: 260, ease: 'Back.easeOut' })
  }

  private finish(): void {
    if (this.done) return
    this.done = true
    const onDone = this.payload.onDone
    this.scene.stop()
    onDone()
  }
}
