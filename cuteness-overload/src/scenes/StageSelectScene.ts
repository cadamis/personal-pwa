import Phaser from 'phaser'
import { artScale } from '../art/textures'
import { P, darken, lighten } from '../art/palette'
import { sfx } from '../audio/sfx'
import { CHARACTERS, toCharacterId, type CharacterId } from '../data/characters'
import { ENEMIES } from '../data/enemies'
import { LEVELS, LEVEL_IDS, type LevelId } from '../data/levels'
import { isGrumpierUnlocked, isLevelUnlocked, loadSave, writeSave, type SaveData } from '../game/save'
import { Button } from '../ui/Button'
import { gridFor, rebuildOnResize, uiScale } from '../ui/layout'
import { drawCard, drawMenuBackdrop, textStyle } from '../ui/theme'
import { formatTime } from './MenuScene'

/**
 * Where to play. Every level is a card with a window onto its floor, its boss
 * peeking out, your best time and how many times you've won there. Beating a
 * level's boss also unlocks Grumpier mode for it.
 */
export class StageSelectScene extends Phaser.Scene {
  private save: SaveData = loadSave()
  private characterId: CharacterId = 'mochi'
  private root!: Phaser.GameObjects.Container

  constructor() {
    super('StageSelect')
  }

  init(data: { characterId?: string }): void {
    this.characterId = toCharacterId(data?.characterId)
  }

  create(): void {
    this.save = loadSave()
    this.root = this.add.container(0, 0)
    this.build()
    rebuildOnResize(this, () => this.rebuild())
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'))
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
    drawMenuBackdrop(bg, w, h, P.lavender)

    add(
      this.add
        .text(w / 2, 12 * s, 'Where to?', textStyle({ size: 38 * s, color: P.lemon, stroke: P.ink, strokeWidth: 6 * s, bold: true }))
        .setOrigin(0.5, 0),
    )
    const friend = CHARACTERS[this.characterId]
    add(
      this.add
        .image(24 * s, 34 * s, friend.texture)
        .setScale(artScale(friend.texture) * 1.4 * s)
        .setOrigin(0, 0.5),
    )

    const headerH = 62 * s
    const footerH = 76 * s
    const pad = 14 * s
    const gap = 12 * s
    const { cols, cellW, cellH } = gridFor(LEVEL_IDS.length, w - pad * 2, h - headerH - footerH, gap, 1.9)
    LEVEL_IDS.forEach((id, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const rowsTotal = Math.ceil(LEVEL_IDS.length / cols)
      const inRow = row === rowsTotal - 1 ? LEVEL_IDS.length - row * cols : cols
      // Centre a short last row rather than leaving it hanging to the left.
      const rowOffset = ((cols - inRow) * (cellW + gap)) / 2
      const x = pad + rowOffset + col * (cellW + gap)
      const y = headerH + row * (cellH + gap)
      add(this.makeCard(id, x, y, cellW, cellH, s))
    })

    // Footer: back, and the Grumpier toggle.
    const anyGrumpier = LEVEL_IDS.some((id) => isGrumpierUnlocked(this.save, id))
    const btnH = 52 * s
    const btnW = Math.min(220 * s, (w - pad * 3) / 2)
    const fy = h - footerH / 2
    add(
      new Button(this, anyGrumpier ? w / 2 - btnW / 2 - 8 * s : w / 2, fy, {
        label: '◀ Back',
        width: btnW,
        height: btnH,
        fill: P.lavender,
        fontSize: 22 * s,
        onClick: () => this.scene.start('Menu'),
      }),
    )
    if (anyGrumpier) {
      add(
        new Button(this, w / 2 + btnW / 2 + 8 * s, fy, {
          label: this.save.grumpier ? '😠 Grumpier: ON' : '🙂 Grumpier: off',
          width: btnW,
          height: btnH,
          fill: this.save.grumpier ? P.grumpRed : P.mint,
          fontSize: 19 * s,
          onClick: () => {
            this.save = { ...this.save, grumpier: !this.save.grumpier }
            writeSave(this.save)
            this.rebuild()
          },
        }),
      )
    }
  }

  private makeCard(id: LevelId, x: number, y: number, w: number, h: number, s: number): Phaser.GameObjects.Container {
    const level = LEVELS[id]
    const open = isLevelUnlocked(this.save, id)
    const wins = this.save.levelWins[id] ?? 0
    const grumpierOpen = isGrumpierUnlocked(this.save, id)
    const grumpy = this.save.grumpier && grumpierOpen
    const card = this.add.container(x + w / 2, y + h / 2)

    const g = this.add.graphics()
    drawCard(g, -w / 2, -h / 2, w, h, {
      fill: open ? lighten(level.accent, 0.72) : 0x6a5f80,
      edge: grumpy ? P.grumpRed : open ? darken(level.accent, 0.15) : 0x4a4060,
      radius: 18 * s,
      glow: grumpy,
    })
    card.add(g)

    // A window onto the level's floor, with its boss peeking in.
    const winW = Math.min(w * 0.42, h * 0.8)
    const winH = h - 20 * s
    const winX = -w / 2 + 10 * s + winW / 2
    const floor = this.add.tileSprite(winX, 0, winW, winH, level.backdrop).setTileScale(0.6).setAlpha(open ? 1 : 0.35)
    card.add(floor)
    const frame = this.add.graphics()
    frame.lineStyle(3, open ? darken(level.accent, 0.3) : 0x4a4060, 1)
    frame.strokeRoundedRect(winX - winW / 2, -winH / 2, winW, winH, 10 * s)
    card.add(frame)
    const boss = ENEMIES[level.boss]
    const bossImg = this.add.image(winX, winH * 0.06, boss.texture, 0)
    bossImg.setScale(Math.min((winW * 0.8) / bossImg.width, (winH * 0.8) / bossImg.height))
    if (!open) bossImg.setTint(0x2b1f3a).setAlpha(0.8)
    card.add(bossImg)
    if (open) this.tweens.add({ targets: bossImg, y: bossImg.y - 4 * s, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const textX = winX + winW / 2 + 12 * s
    const textW = w / 2 - textX - 10 * s
    const nameSize = Math.min(22 * s, h * 0.15)
    // Stacked from the top so a name that wraps onto two lines pushes the
    // blurb down instead of running into it.
    const name = this.add
      .text(textX, -h / 2 + 12 * s, `${open ? level.icon : '🔒'} ${level.name}`, textStyle({ size: nameSize, color: open ? P.ink : P.white, bold: true, align: 'left', wrap: textW }))
      .setOrigin(0, 0)
    card.add(name)
    const blurb = open
      ? level.blurb
      : `Beat ${ENEMIES[LEVELS[level.unlockedBy ?? 'meadow'].boss].name} in ${LEVELS[level.unlockedBy ?? 'meadow'].name} to open this!`
    card.add(
      this.add
        .text(textX, name.y + name.height + 4 * s, blurb, textStyle({ size: Math.min(14 * s, h * 0.1), color: open ? P.inkSoft : P.lavender, align: 'left', wrap: textW }))
        .setOrigin(0, 0),
    )
    if (open) {
      const best = this.save.bestTimes[id] ?? 0
      const fresh = best === 0 && wins === 0
      const stats = [best > 0 ? `⏱️ ${formatTime(best)}` : '', wins > 0 ? `👑 ×${wins}` : '', fresh ? '✨ New!' : '', grumpierOpen ? ((this.save.grumpierWins[id] ?? 0) > 0 ? '😠 ✓' : '😠') : '']
        .filter(Boolean)
        .join('   ')
      card.add(
        this.add
          .text(textX, h * 0.3, stats, textStyle({ size: Math.min(15 * s, h * 0.11), color: P.purple, bold: true, align: 'left', wrap: textW }))
          .setOrigin(0, 0.5),
      )
      card.setSize(w, h)
      card.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
      card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        sfx.unlock()
        sfx.play('tap')
        this.tweens.add({ targets: card, scale: 0.95, duration: 70, yoyo: true, onComplete: () => this.start(id, grumpy) })
      })
    }
    return card
  }

  private start(levelId: LevelId, grumpier: boolean): void {
    this.save = { ...loadSave(), lastLevel: levelId }
    writeSave(this.save)
    this.scene.start('Game', { characterId: this.characterId, levelId, grumpier })
  }
}
