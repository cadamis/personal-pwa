import Phaser from 'phaser'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { METAS, META_IDS, type MetaId } from '../data/meta'
import { clearSave, loadSave, metaLevel, nextMetaCost, tryBuyMeta, writeSave, type SaveData } from '../game/save'
import { Button } from '../ui/Button'
import { gridFor, rebuildOnResize, uiScale } from '../ui/layout'
import { drawMenuBackdrop, drawPanel, textStyle } from '../ui/theme'

/** The between-runs shop. Everything bought here is permanent. */
export class ShopScene extends Phaser.Scene {
  private save: SaveData = loadSave()
  private root!: Phaser.GameObjects.Container
  private resetArmed = false

  constructor() {
    super('Shop')
  }

  create(): void {
    this.save = loadSave()
    this.resetArmed = false
    this.root = this.add.container(0, 0)
    this.build()
    rebuildOnResize(this, () => this.rebuild())
  }

  private rebuild(): void {
    this.root.removeAll(true)
    this.build()
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
    drawMenuBackdrop(bg, w, h)

    add(
      this.add
        .text(w / 2, 14 * s, 'Sprinkle Shop', textStyle({ size: 36 * s, color: P.lemon, stroke: P.ink, strokeWidth: 6 * s, bold: true }))
        .setOrigin(0.5, 0),
    )
    add(
      this.add
        .text(w - 16 * s, 18 * s, `🍬 ${this.save.sprinkles}`, textStyle({ size: 26 * s, color: P.lemon, bold: true }))
        .setOrigin(1, 0),
    )

    const headerH = 62 * s
    const footerH = 74 * s
    const pad = 14 * s
    const gap = 10 * s
    const gridW = w - pad * 2
    const gridH = h - headerH - footerH
    const { cols, cellW, cellH } = gridFor(META_IDS.length, gridW, gridH, gap, 2.5)

    META_IDS.forEach((id, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = pad + col * (cellW + gap)
      const y = headerH + row * (cellH + gap)
      add(this.makeCard(id, x, y, cellW, cellH, s))
    })

    add(
      new Button(this, w / 2, h - footerH / 2 - 2 * s, {
        label: '◀ Back',
        width: Math.min(240 * s, w * 0.5),
        height: 54 * s,
        fill: P.pink,
        fontSize: 26 * s,
        onClick: () => this.scene.start('Menu'),
      }),
    )

    const reset = add(
      this.add
        .text(w - 12 * s, h - 10 * s, 'reset progress', textStyle({ size: 14 * s, color: P.inkSoft }))
        .setOrigin(1, 1)
        .setInteractive({ useHandCursor: true }),
    )
    reset.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (!this.resetArmed) {
        this.resetArmed = true
        reset.setText('really? tap again').setColor('#ff8f7a')
        this.time.delayedCall(4000, () => {
          if (!this.scene.isActive()) return
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
    const cost = nextMetaCost(this.save, id)
    const maxed = cost === null
    const affordable = cost !== null && this.save.sprinkles >= cost

    const card = this.add.container(x + w / 2, y + h / 2)
    const g = this.add.graphics()
    drawPanel(g, -w / 2, -h / 2, w, h, {
      fill: maxed ? P.mint : P.panel,
      edge: affordable ? P.gold : P.panelEdge,
      radius: 16 * s,
    })
    card.add(g)

    const iconSize = Math.min(h * 0.42, 40 * s)
    card.add(this.add.text(-w / 2 + 14 * s, -h * 0.18, def.icon, textStyle({ size: iconSize })).setOrigin(0, 0.5))

    const textX = -w / 2 + 16 * s + iconSize
    card.add(
      this.add
        .text(textX, -h * 0.28, def.name, textStyle({ size: Math.min(20 * s, h * 0.2), color: P.purple, bold: true }))
        .setOrigin(0, 0.5),
    )
    card.add(
      this.add
        .text(textX, -h * 0.05, def.effectText, textStyle({ size: Math.min(15 * s, h * 0.16), color: P.ink }))
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
            size: Math.min(19 * s, h * 0.2),
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
