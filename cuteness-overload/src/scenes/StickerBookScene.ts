import Phaser from 'phaser'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { CHARACTERS } from '../data/characters'
import { METAS } from '../data/meta'
import { PASSIVES } from '../data/passives'
import { STICKERS, STICKER_IDS, rewardText, type StickerId } from '../data/stickers'
import { BASE_WEAPON_IDS, WEAPONS } from '../data/weapons'
import { loadSave, markStickersSeen, writeSave, type SaveData } from '../game/save'
import { Button } from '../ui/Button'
import { gridFor, rebuildOnResize, uiScale } from '../ui/layout'
import { drawCard, drawMenuBackdrop, textStyle } from '../ui/theme'

type Tab = 'stickers' | 'recipes'

const REWARD_NAMES = {
  weapon: (id: keyof typeof WEAPONS) => `${WEAPONS[id].icon} ${WEAPONS[id].name}`,
  character: (id: keyof typeof CHARACTERS) => CHARACTERS[id].name,
  shop: (id: keyof typeof METAS) => `${METAS[id].icon} ${METAS[id].name}`,
}

/**
 * The Sticker Book: every achievement, earned or not, with what it takes and
 * what it gives. The second tab is the recipe book for evolutions — which
 * weapon, plus which buddy, makes what — filled in as they're discovered.
 */
export class StickerBookScene extends Phaser.Scene {
  private save: SaveData = loadSave()
  /** Stickers that were new when the book was opened; they keep their badge this visit. */
  private fresh = new Set<StickerId>()
  private tab: Tab = 'stickers'
  private page = 0
  private root!: Phaser.GameObjects.Container

  constructor() {
    super('StickerBook')
  }

  create(): void {
    this.save = loadSave()
    this.fresh = new Set(this.save.newStickers)
    if (this.save.newStickers.length > 0) {
      this.save = markStickersSeen(this.save)
      writeSave(this.save)
    }
    this.tab = 'stickers'
    this.page = 0
    this.root = this.add.container(0, 0)
    this.build()
    rebuildOnResize(this, () => this.rebuild())
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'))
    this.input.keyboard?.on('keydown-LEFT', () => this.turn(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.turn(1))
  }

  private rebuild(): void {
    this.root.removeAll(true)
    this.build()
  }

  private perPage(): number {
    const s = uiScale(this)
    const area = (this.scale.width - 28 * s) * (this.scale.height - 190 * s)
    return Math.max(6, Math.min(this.tab === 'stickers' ? 15 : 16, Math.floor(area / (150 * 130 * s * s))))
  }

  private pageCount(): number {
    const total = this.tab === 'stickers' ? STICKER_IDS.length : BASE_WEAPON_IDS.length
    return Math.max(1, Math.ceil(total / this.perPage()))
  }

  private turn(dir: number): void {
    const next = Phaser.Math.Clamp(this.page + dir, 0, this.pageCount() - 1)
    if (next === this.page) return
    this.page = next
    sfx.play('tap')
    this.rebuild()
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
    drawMenuBackdrop(bg, w, h, P.mint)

    const earned = this.save.stickers.length
    add(
      this.add
        .text(w / 2, 10 * s, 'Sticker Book', textStyle({ size: 36 * s, color: P.lemon, stroke: P.ink, strokeWidth: 6 * s, bold: true }))
        .setOrigin(0.5, 0),
    )

    // Tabs.
    const tabW = Math.min(200 * s, (w - 40 * s) / 2)
    const tabY = 74 * s
    const tabs: [Tab, string][] = [
      ['stickers', `📖 Stickers ${earned}/${STICKER_IDS.length}`],
      ['recipes', `🧪 Recipes ${this.save.evolutionsFound.length}/${BASE_WEAPON_IDS.length}`],
    ]
    tabs.forEach(([tab, label], i) => {
      add(
        new Button(this, w / 2 + (i - 0.5) * (tabW + 10 * s), tabY, {
          label,
          width: tabW,
          height: 42 * s,
          fill: this.tab === tab ? P.pink : P.nightSoft,
          textColor: this.tab === tab ? P.ink : P.white,
          fontSize: 17 * s,
          onClick: () => {
            if (this.tab === tab) return
            this.tab = tab
            this.page = 0
            this.rebuild()
          },
        }),
      )
    })

    const top = 104 * s
    const footer = 70 * s
    const pad = 14 * s
    const gap = 10 * s
    const perPage = this.perPage()
    const ids = this.tab === 'stickers' ? STICKER_IDS : BASE_WEAPON_IDS
    const slice = ids.slice(this.page * perPage, (this.page + 1) * perPage)
    const { cols, cellW, cellH } = gridFor(perPage, w - pad * 2, h - top - footer, gap, this.tab === 'stickers' ? 1.45 : 2.6)
    slice.forEach((id, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = pad + col * (cellW + gap)
      const y = top + row * (cellH + gap)
      if (this.tab === 'stickers') add(this.stickerCell(id as StickerId, x, y, cellW, cellH, s))
      else add(this.recipeCell(id as (typeof BASE_WEAPON_IDS)[number], x, y, cellW, cellH, s))
    })

    // Footer: pages and back.
    const fy = h - footer / 2
    const pages = this.pageCount()
    add(
      new Button(this, w / 2, fy, {
        label: '◀ Back',
        width: Math.min(200 * s, w * 0.4),
        height: 50 * s,
        fill: P.lavender,
        fontSize: 22 * s,
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
          new Button(this, w / 2 + dir * Math.min(170 * s, w * 0.34), fy, {
            label,
            width: 60 * s,
            height: 50 * s,
            fill: P.mint,
            fontSize: 24 * s,
            onClick: () => this.turn(dir),
          }).setEnabled(enabled),
        )
      }
      add(
        this.add
          .text(w / 2, fy - 36 * s, `page ${this.page + 1} of ${pages}`, textStyle({ size: 13 * s, color: P.lavender }))
          .setOrigin(0.5),
      )
    }
  }

  /** A sticker, drawn die-cut: fat white border, drop shadow, slightly askew. */
  private stickerCell(id: StickerId, x: number, y: number, w: number, h: number, s: number): Phaser.GameObjects.Container {
    const def = STICKERS[id]
    const have = this.save.stickers.includes(id)
    const isNew = this.fresh.has(id)
    const cell = this.add.container(x + w / 2, y + h / 2)
    const g = this.add.graphics()
    drawCard(g, -w / 2, -h / 2, w, h, { fill: have ? P.panel : 0x5d5275, edge: isNew ? P.gold : have ? P.panelEdge : 0x4a4060, radius: 16 * s, glow: isNew })
    cell.add(g)

    const r = Math.min(h * 0.26, w * 0.2)
    const cx = -w / 2 + r + 12 * s
    const cy = -h * 0.12
    const sticker = this.add.graphics()
    // Seeded tilt so each sticker sits at its own angle, the same every visit.
    const tilt = ((id.length * 37 + id.charCodeAt(0)) % 17) - 8
    sticker.fillStyle(P.night, 0.3)
    sticker.fillCircle(cx + 2 * s, cy + 4 * s, r + 4 * s)
    sticker.fillStyle(have ? P.white : 0x7a7090, 1)
    sticker.fillCircle(cx, cy, r + 4 * s)
    sticker.fillStyle(have ? P.pink : 0x4a4060, 1)
    sticker.fillCircle(cx, cy, r)
    if (have) {
      sticker.fillStyle(P.white, 0.35)
      sticker.fillEllipse(cx - r * 0.3, cy - r * 0.45, r * 0.9, r * 0.45)
    }
    cell.add(sticker)
    const icon = this.add.text(cx, cy, have ? def.icon : '?', textStyle({ size: r * 1.1, color: P.white, bold: true })).setOrigin(0.5)
    icon.setAngle(tilt)
    if (!have) icon.setAlpha(0.8)
    cell.add(icon)

    const textX = cx + r + 12 * s
    const textW = w / 2 - textX - 8 * s
    cell.add(
      this.add
        .text(textX, -h * 0.3, def.name, textStyle({ size: Math.min(16 * s, h * 0.14), color: have ? P.purple : P.white, bold: true, align: 'left', wrap: textW }))
        .setOrigin(0, 0.5),
    )
    cell.add(
      this.add
        .text(textX, -h * 0.02, def.desc, textStyle({ size: Math.min(12.5 * s, h * 0.11), color: have ? P.ink : P.lavender, align: 'left', wrap: textW }))
        .setOrigin(0, 0.5),
    )
    cell.add(
      this.add
        .text(-w / 2 + 12 * s, h * 0.34, `${have ? '✓ ' : '🎁 '}${rewardText(def.reward, REWARD_NAMES)}`, textStyle({ size: Math.min(12 * s, h * 0.1), color: have ? P.teal : P.lemon, bold: true, align: 'left', wrap: w - 24 * s }))
        .setOrigin(0, 0.5),
    )
    if (isNew) {
      const badge = this.add.text(w / 2 - 8 * s, -h / 2 + 4 * s, 'NEW!', textStyle({ size: 14 * s, color: P.white, stroke: P.pinkHot, strokeWidth: 4 * s, bold: true })).setOrigin(1, 0)
      cell.add(badge)
      this.tweens.add({ targets: badge, scale: 1.15, duration: 450, yoyo: true, repeat: -1 })
    }
    return cell
  }

  /** One evolution recipe: weapon + buddy = evolution (or a question mark). */
  private recipeCell(id: (typeof BASE_WEAPON_IDS)[number], x: number, y: number, w: number, h: number, s: number): Phaser.GameObjects.Container {
    const base = WEAPONS[id]
    const evo = base.evolution
    const found = evo ? this.save.evolutionsFound.includes(evo.into) : false
    const cell = this.add.container(x + w / 2, y + h / 2)
    const g = this.add.graphics()
    drawCard(g, -w / 2, -h / 2, w, h, { fill: found ? 0xfff4d6 : P.panel, edge: found ? P.gold : P.panelEdge, radius: 14 * s })
    cell.add(g)
    if (!evo) return cell
    const buddy = PASSIVES[evo.needs]
    const into = WEAPONS[evo.into]
    const size = Math.min(h * 0.42, 30 * s)
    const eq = `${base.icon} + ${buddy.icon} = ${found ? into.icon : '❓'}`
    cell.add(this.add.text(-w / 2 + 10 * s, -h * 0.16, eq, textStyle({ size, align: 'left' })).setOrigin(0, 0.5))
    cell.add(
      this.add
        .text(-w / 2 + 10 * s, h * 0.28, found ? `${into.name}!` : `${base.name} + ${buddy.name} = ???`, textStyle({ size: Math.min(13 * s, h * 0.2), color: found ? P.pinkHot : P.inkSoft, bold: found, align: 'left', wrap: w - 20 * s }))
        .setOrigin(0, 0.5),
    )
    return cell
  }
}
