import Phaser from 'phaser'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { METAS, META_IDS, type MetaId } from '../data/meta'
import { STICKERS, shopUnlockSticker } from '../data/stickers'
import {
  clearSave,
  isShopItemAvailable,
  loadSave,
  metaLevel,
  nextMetaCost,
  tryBuyMeta,
  writeSave,
  type SaveData,
} from '../game/save'
import { Button } from '../ui/Button'
import { gridFor, rebuildOnResize, uiScale } from '../ui/layout'
import { drawCard, drawMenuBackdrop, textStyle } from '../ui/theme'

/** The between-runs shop. Everything bought here is permanent. */
export class ShopScene extends Phaser.Scene {
  private save: SaveData = loadSave()
  private root!: Phaser.GameObjects.Container
  private resetArmed = false
  private page = 0

  constructor() {
    super('Shop')
  }

  create(): void {
    this.save = loadSave()
    this.resetArmed = false
    this.page = 0
    this.root = this.add.container(0, 0)
    this.build()
    rebuildOnResize(this, () => this.rebuild())
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'))
  }

  private rebuild(): void {
    this.root.removeAll(true)
    this.build()
  }

  /** As many cards as fit comfortably, so a phone gets pages and an iPad gets one. */
  private perPage(): number {
    const s = uiScale(this)
    const area = (this.scale.width - 28 * s) * (this.scale.height - 150 * s)
    return Math.max(6, Math.min(META_IDS.length, Math.floor(area / (240 * 86 * s * s))))
  }

  private build(): void {
    const w = this.scale.width
    const h = this.scale.height
    const s = uiScale(this)
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.root.add(obj)
      return obj
    }

    const bg = add(this.add.graphics())
    drawMenuBackdrop(bg, w, h, P.lemon)

    add(
      this.add
        .text(w / 2, 12 * s, 'Sprinkle Shop', textStyle({ size: 36 * s, color: P.lemon, stroke: P.ink, strokeWidth: 6 * s, bold: true }))
        .setOrigin(0.5, 0),
    )
    add(
      this.add
        .text(w - 16 * s, 18 * s, `🍬 ${this.save.sprinkles}`, textStyle({ size: 26 * s, color: P.lemon, bold: true }))
        .setOrigin(1, 0),
    )

    const perPage = this.perPage()
    const pages = Math.ceil(META_IDS.length / perPage)
    this.page = Math.min(this.page, pages - 1)
    const headerH = 62 * s
    const footerH = 78 * s
    const pad = 14 * s
    const gap = 10 * s
    const gridW = w - pad * 2
    const gridH = h - headerH - footerH
    const { cols, cellW, cellH } = gridFor(perPage, gridW, gridH, gap, 2.5)
    META_IDS.slice(this.page * perPage, (this.page + 1) * perPage).forEach((id, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = pad + col * (cellW + gap)
      const y = headerH + row * (cellH + gap)
      add(this.makeCard(id, x, y, cellW, cellH, s))
    })

    const fy = h - footerH / 2 - 2 * s
    add(
      new Button(this, w / 2, fy, {
        label: '◀ Back',
        width: Math.min(220 * s, w * 0.42),
        height: 52 * s,
        fill: P.pink,
        fontSize: 24 * s,
        onClick: () => this.scene.start('Menu'),
      }),
    )
    if (pages > 1) {
      for (const [dir, label] of [
        [-1, '◀'],
        [1, '▶'],
      ] as const) {
        const enabled = dir < 0 ? this.page > 0 : this.page < pages - 1
        add(
          new Button(this, w / 2 + dir * Math.min(180 * s, w * 0.34), fy, {
            label,
            width: 60 * s,
            height: 52 * s,
            fill: P.mint,
            fontSize: 24 * s,
            onClick: () => {
              this.page += dir
              this.rebuild()
            },
          }).setEnabled(enabled),
        )
      }
    }

    // A rebuild (page flip, purchase, resize) always disarms the reset link.
    this.resetArmed = false
    const reset = add(
      this.add
        .text(w - 12 * s, h - 8 * s, 'reset progress', textStyle({ size: 13 * s, color: P.inkSoft }))
        .setOrigin(1, 1)
        .setInteractive({ useHandCursor: true }),
    )
    reset.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (!this.resetArmed) {
        this.resetArmed = true
        reset.setText('really? tap again').setColor('#ff8f7a')
        this.time.delayedCall(4000, () => {
          if (!this.scene.isActive() || !reset.active) return
          this.resetArmed = false
          reset.setText('reset progress').setColor('#7a6885')
        })
        return
      }
      clearSave()
      this.save = loadSave()
      sfx.play('lose')
      this.rebuild()
    })
  }

  private makeCard(id: MetaId, x: number, y: number, w: number, h: number, s: number): Phaser.GameObjects.Container {
    const def = METAS[id]
    const owned = metaLevel(this.save, id)
    const available = isShopItemAvailable(this.save, id)
    const cost = nextMetaCost(this.save, id)
    const maxed = cost === null
    const affordable = available && cost !== null && this.save.sprinkles >= cost

    const card = this.add.container(x + w / 2, y + h / 2)
    const g = this.add.graphics()
    drawCard(g, -w / 2, -h / 2, w, h, {
      fill: !available ? 0x5d5275 : maxed ? P.mint : P.panel,
      edge: affordable ? P.gold : !available ? 0x4a4060 : P.panelEdge,
      radius: 16 * s,
      glow: affordable,
    })
    card.add(g)

    const iconSize = Math.min(h * 0.42, 40 * s)
    card.add(
      this.add
        .text(-w / 2 + 14 * s, -h * 0.16, available ? def.icon : '🔒', textStyle({ size: iconSize }))
        .setOrigin(0, 0.5),
    )

    const textX = -w / 2 + 20 * s + iconSize
    card.add(
      this.add
        .text(textX, -h * 0.28, def.name, textStyle({ size: Math.min(19 * s, h * 0.2), color: available ? P.purple : P.white, bold: true }))
        .setOrigin(0, 0.5),
    )

    if (!available) {
      const sticker = shopUnlockSticker(id)
      card.add(
        this.add
          .text(textX, h * 0.12, sticker ? `Earn the ${STICKERS[sticker].icon} ${STICKERS[sticker].name} sticker` : 'Locked', textStyle({ size: Math.min(13 * s, h * 0.14), color: P.lemon, align: 'left', wrap: w - (textX + w / 2) - 10 * s }))
          .setOrigin(0, 0.5),
      )
      return card
    }

    card.add(
      this.add
        .text(textX, -h * 0.05, def.effectText, textStyle({ size: Math.min(14 * s, h * 0.15), color: P.ink }))
        .setOrigin(0, 0.5),
    )

    // Level pips
    const pips = '●'.repeat(owned) + '○'.repeat(def.maxLevel - owned)
    card.add(
      this.add
        .text(textX, h * 0.2, pips, textStyle({ size: Math.min(14 * s, h * 0.15), color: P.teal }))
        .setOrigin(0, 0.5),
    )

    card.add(
      this.add
        .text(
          w / 2 - 12 * s,
          h * 0.3,
          maxed ? 'MAXED!' : `🍬 ${cost}`,
          textStyle({
            size: Math.min(18 * s, h * 0.2),
            color: maxed ? P.teal : affordable ? P.gold : P.inkSoft,
            bold: true,
          }),
        )
        .setOrigin(1, 0.5),
    )

    if (!maxed) {
      card.setSize(w, h)
      card.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
      card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        sfx.unlock()
        const next = tryBuyMeta(this.save, id)
        if (!next) {
          sfx.play('hurt')
          this.tweens.add({ targets: card, x: card.x + 5, duration: 55, yoyo: true, repeat: 2 })
          return
        }
        this.save = next
        writeSave(this.save)
        sfx.play('coin')
        this.rebuild()
      })
    }

    return card
  }
}
