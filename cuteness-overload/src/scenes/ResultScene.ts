import Phaser from 'phaser'
import { artScale } from '../art/textures'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { CHARACTERS, toCharacterId } from '../data/characters'
import { STICKERS } from '../data/stickers'
import { WEAPONS } from '../data/weapons'
import { loadSave } from '../game/save'
import { Button } from '../ui/Button'
import { rebuildOnResize, uiScale } from '../ui/layout'
import { drawCard, drawMenuBackdrop, textStyle } from '../ui/theme'
import type { ResultData } from './GameScene'
import { formatTime } from './MenuScene'

/** End-of-run summary, anything new you earned, and the fastest route back into another go. */
export class ResultScene extends Phaser.Scene {
  private payload!: ResultData
  private root!: Phaser.GameObjects.Container
  private celebrated = false

  constructor() {
    super('Result')
  }

  init(data: ResultData): void {
    this.payload = data
    this.celebrated = false
  }

  create(): void {
    this.root = this.add.container(0, 0)
    this.build()
    rebuildOnResize(this, () => {
      this.root.removeAll(true)
      this.build()
    })
  }

  private build(): void {
    const w = this.scale.width
    const h = this.scale.height
    const s = uiScale(this)
    const p = this.payload
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.root.add(obj)
      return obj
    }

    const bg = add(this.add.graphics())
    drawMenuBackdrop(bg, w, h, p.won ? P.gold : P.pink)

    const headline = p.bedtime ? 'BEDTIME!' : p.won ? 'YOU DID IT!' : p.quit ? 'Maybe next time!' : 'Squished!'
    const subline = p.bedtime
      ? 'You lasted all the way to bedtime. Legendary!'
      : p.won
        ? p.unlockedLevel
          ? `${p.unlockedLevel} is now open!`
          : p.endlessSec > 0
            ? `Boss beaten, then ${formatTime(p.endlessSec)} of endless!`
            : 'That boss has been thoroughly out-cuted.'
        : p.quit
          ? 'It will all be here when you get back.'
          : 'The Grumps got you. Rude.'

    add(
      this.add
        .text(w / 2, 12 * s, headline, textStyle({ size: 44 * s, color: p.won ? P.lemon : P.pink, stroke: P.ink, strokeWidth: 7 * s, bold: true }))
        .setOrigin(0.5, 0),
    )
    add(
      this.add
        .text(w / 2, 62 * s, subline, textStyle({ size: 17 * s, color: P.lavender, wrap: w * 0.85 }))
        .setOrigin(0.5, 0),
    )

    const character = CHARACTERS[toCharacterId(p.characterId)]
    const portrait = add(
      this.add
        .image(w / 2, 120 * s, character.texture)
        .setScale(artScale(character.texture) * 1.7 * s)
        .setAlpha(p.won ? 1 : 0.8)
        .setAngle(p.won ? 0 : 14),
    )
    if (p.won) {
      this.tweens.add({ targets: portrait, y: portrait.y - 10, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    // ---------------------------------------------------------------- stats
    const rows: [string, string, number][] = [
      ['🗺️ Level', `${p.levelName}${p.grumpier ? ' 😠' : ''}`, P.purple],
      ['⏱️ Survived', formatTime(p.survivedSec) + (p.newBestTime ? '  ⭐ best!' : ''), P.purple],
      ['💥 Grumps squished', `${p.kills}`, P.ink],
      ['⬆️ Level reached', `${p.level}`, P.ink],
      ['🍬 Sprinkles earned', `${p.earned}`, P.gold],
    ]
    const panelW = Math.min(w * 0.88, 460 * s)
    const rowH = Math.min(30 * s, (h * 0.3) / rows.length)
    const panelH = rowH * rows.length + 20 * s
    const panelX = w / 2 - panelW / 2
    const panelY = 162 * s
    const panel = add(this.add.graphics())
    drawCard(panel, panelX, panelY, panelW, panelH)
    rows.forEach(([label, value, color], i) => {
      const y = panelY + 10 * s + rowH * (i + 0.5)
      add(
        this.add
          .text(panelX + 18 * s, y, label, textStyle({ size: Math.min(18 * s, rowH * 0.6), color: P.inkSoft, align: 'left' }))
          .setOrigin(0, 0.5),
      )
      add(
        this.add
          .text(panelX + panelW - 18 * s, y, value, textStyle({ size: Math.min(19 * s, rowH * 0.62), color, bold: true, align: 'right' }))
          .setOrigin(1, 0.5),
      )
    })

    let y = panelY + panelH + 22 * s
    // Weapons you finished with, as a little trophy shelf.
    if (p.inventory.length > 0) {
      const line = p.inventory.map((weapon) => `${weapon.icon}${weapon.evolved ? '★' : weapon.level}`).join('   ')
      add(this.add.text(w / 2, y, line, textStyle({ size: 21 * s, color: P.white, wrap: w * 0.9 })).setOrigin(0.5, 0.5))
      y += 34 * s
    }

    // Anything new: evolutions discovered for the first time, stickers earned.
    const news: { icon: string; title: string; sub: string; color: number }[] = [
      ...p.evolutions.map((id) => ({ icon: WEAPONS[id].icon, title: `New recipe: ${WEAPONS[id].name}!`, sub: 'Added to the recipe book', color: P.pinkHot })),
      ...p.stickers.map((id) => ({ icon: STICKERS[id].icon, title: `Sticker: ${STICKERS[id].name}`, sub: stickerRewardLine(id), color: P.gold })),
    ]
    const bottomReserve = 150 * s
    const space = h - bottomReserve - y
    const chipH = Math.min(46 * s, Math.max(30 * s, space / Math.max(1, news.length)))
    const shown = news.slice(0, Math.max(0, Math.floor(space / (chipH + 6 * s))))
    shown.forEach((item, i) => {
      const chip = add(this.add.container(w / 2, y + chipH / 2 + i * (chipH + 6 * s)))
      const g = this.add.graphics()
      const chipW = Math.min(w * 0.9, 480 * s)
      drawCard(g, -chipW / 2, -chipH / 2, chipW, chipH, { fill: P.panel, edge: item.color, radius: 14 * s, glow: true })
      chip.add(g)
      chip.add(this.add.text(-chipW / 2 + 12 * s, 0, item.icon, textStyle({ size: chipH * 0.55 })).setOrigin(0, 0.5))
      chip.add(
        this.add
          .text(-chipW / 2 + chipH * 1.05, -chipH * 0.18, item.title, textStyle({ size: Math.min(16 * s, chipH * 0.34), color: P.purple, bold: true, align: 'left' }))
          .setOrigin(0, 0.5),
      )
      chip.add(
        this.add
          .text(-chipW / 2 + chipH * 1.05, chipH * 0.22, item.sub, textStyle({ size: Math.min(13 * s, chipH * 0.28), color: P.teal, align: 'left' }))
          .setOrigin(0, 0.5),
      )
      if (!this.celebrated) {
        chip.setScale(0.3).setAlpha(0)
        this.tweens.add({
          targets: chip,
          scale: 1,
          alpha: 1,
          delay: 500 + i * 380,
          duration: 320,
          ease: 'Back.easeOut',
          onStart: () => sfx.play('sticker', 0),
        })
      }
    })
    if (news.length > shown.length) {
      add(
        this.add
          .text(w / 2, y + shown.length * (chipH + 6 * s) + 8 * s, `...and ${news.length - shown.length} more in the Sticker Book!`, textStyle({ size: 14 * s, color: P.lemon }))
          .setOrigin(0.5, 0),
      )
    }
    this.celebrated = true

    const save = loadSave()
    add(
      this.add
        .text(w / 2, h - 108 * s, `Sprinkle jar: 🍬 ${save.sprinkles}`, textStyle({ size: 19 * s, color: P.lemon, bold: true }))
        .setOrigin(0.5, 1),
    )

    // -------------------------------------------------------------- buttons
    const btnW = Math.min(200 * s, w * 0.42)
    const btnH = 56 * s
    const btnY = h - btnH * 0.95
    add(
      new Button(this, w / 2 - btnW * 0.55, btnY, {
        label: 'Again!',
        width: btnW,
        height: btnH,
        fill: P.pink,
        fontSize: 26 * s,
        onClick: () =>
          this.scene.start('Game', {
            characterId: p.characterId,
            levelId: p.levelId,
            grumpier: p.grumpier,
          }),
      }),
    )
    add(
      new Button(this, w / 2 + btnW * 0.55, btnY, {
        label: '🍬 Shop',
        width: btnW,
        height: btnH,
        fill: P.lavender,
        fontSize: 26 * s,
        onClick: () => this.scene.start('Shop'),
      }),
    )
    add(
      this.add
        .text(w - 14 * s, 14 * s, 'Menu', textStyle({ size: 20 * s, color: P.lavender, bold: true }))
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.scene.start('Menu')),
    )
    if (p.stickers.length > 0) {
      add(
        this.add
          .text(14 * s, 14 * s, '📖 Stickers', textStyle({ size: 20 * s, color: P.mint, bold: true }))
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true })
          .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.scene.start('StickerBook')),
      )
    }
  }
}

function stickerRewardLine(id: keyof typeof STICKERS): string {
  const reward = STICKERS[id].reward
  switch (reward.kind) {
    case 'sprinkles':
      return `+🍬 ${reward.amount} sprinkles`
    case 'weapon':
      return `Unlocked ${WEAPONS[reward.id].icon} ${WEAPONS[reward.id].name}!`
    case 'character':
      return `Unlocked ${CHARACTERS[reward.id].name}!`
    case 'shop':
      return 'Something new in the shop!'
  }
}
