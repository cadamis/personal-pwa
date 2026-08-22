import Phaser from 'phaser'
import { ART_SCALE } from '../art/textures'
import { P } from '../art/palette'
import { CHARACTERS, toCharacterId } from '../data/characters'
import { loadSave } from '../game/save'
import { Button } from '../ui/Button'
import { rebuildOnResize, uiScale } from '../ui/layout'
import { drawMenuBackdrop, drawPanel, textStyle } from '../ui/theme'
import { formatTime } from './MenuScene'

interface ResultData {
  won: boolean
  quit: boolean
  levelId: string
  levelName: string
  /** Name of a level this win just opened up, if any. */
  unlockedLevel: string | null
  survivedSec: number
  kills: number
  earned: number
  level: number
  characterId: string
  newBestTime: boolean
  inventory: { icon: string; name: string; level: number }[]
}

/** End-of-run summary, and the fastest possible route back into another go. */
export class ResultScene extends Phaser.Scene {
  private payload!: ResultData
  private root!: Phaser.GameObjects.Container

  constructor() {
    super('Result')
  }

  init(data: ResultData): void {
    this.payload = data
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
    const { won, quit } = this.payload
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.root.add(obj)
      return obj
    }

    const bg = add(this.add.graphics())
    drawMenuBackdrop(bg, w, h)

    const headline = won ? 'YOU DID IT!' : quit ? 'Maybe next time!' : 'Squished!'
    const subline = won
      ? this.payload.unlockedLevel
        ? `${this.payload.unlockedLevel} is now open!`
        : 'That boss has been thoroughly out-cuted.'
      : quit
        ? 'It will all be here when you get back.'
        : 'The Grumps got you. Rude.'

    add(
      this.add
        .text(w / 2, 16 * s, headline, textStyle({ size: 46 * s, color: won ? P.lemon : P.pink, stroke: P.ink, strokeWidth: 7 * s, bold: true }))
        .setOrigin(0.5, 0),
    )
    add(
      this.add
        .text(w / 2, 66 * s, subline, textStyle({ size: 18 * s, color: P.lavender, wrap: w * 0.85 }))
        .setOrigin(0.5, 0),
    )

    const character = CHARACTERS[toCharacterId(this.payload.characterId)]
    const portrait = add(
      this.add
        .image(w / 2, 118 * s, character.texture)
        .setScale(ART_SCALE * 2.2 * s)
        .setAlpha(won ? 1 : 0.75)
        .setAngle(won ? 0 : 14),
    )
    if (won) {
      this.tweens.add({ targets: portrait, y: portrait.y - 10, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    // ---------------------------------------------------------------- stats
    const panelW = Math.min(w * 0.86, 460 * s)
    const panelH = Math.min(h * 0.32, 190 * s)
    const panelX = w / 2 - panelW / 2
    const panelY = 156 * s
    const panel = add(this.add.graphics())
    drawPanel(panel, panelX, panelY, panelW, panelH)

    const rows: [string, string, number][] = [
      ['🗺️ Level', this.payload.levelName, P.purple],
      ['⏱️ Survived', formatTime(this.payload.survivedSec) + (this.payload.newBestTime ? '  ⭐ best!' : ''), P.purple],
      ['💥 Grumps squished', `${this.payload.kills}`, P.ink],
      ['⬆️ Level reached', `${this.payload.level}`, P.ink],
      ['🍬 Sprinkles earned', `${this.payload.earned}`, P.gold],
    ]
    rows.forEach(([label, value, color], i) => {
      const y = panelY + panelH * (0.18 + i * 0.22)
      add(
        this.add
          .text(panelX + 18 * s, y, label, textStyle({ size: Math.min(19 * s, panelH * 0.14), color: P.inkSoft, align: 'left' }))
          .setOrigin(0, 0.5),
      )
      add(
        this.add
          .text(panelX + panelW - 18 * s, y, value, textStyle({ size: Math.min(20 * s, panelH * 0.15), color, bold: true, align: 'right' }))
          .setOrigin(1, 0.5),
      )
    })

    // Weapons you finished with, as a little trophy shelf.
    if (this.payload.inventory.length > 0) {
      const shelfY = panelY + panelH + 26 * s
      const line = this.payload.inventory.map((weapon) => `${weapon.icon}${weapon.level}`).join('   ')
      add(
        this.add
          .text(w / 2, shelfY, line, textStyle({ size: 22 * s, color: P.white, wrap: w * 0.9 }))
          .setOrigin(0.5, 0.5),
      )
    }

    const save = loadSave()
    add(
      this.add
        .text(w / 2, h - 96 * s, `Sprinkle jar: 🍬 ${save.sprinkles}`, textStyle({ size: 20 * s, color: P.lemon, bold: true }))
        .setOrigin(0.5, 1),
    )

    // -------------------------------------------------------------- buttons
    const btnW = Math.min(200 * s, w * 0.42)
    const btnH = 58 * s
    const btnY = h - btnH * 0.9
    add(
      new Button(this, w / 2 - btnW * 0.55, btnY, {
        label: 'Again!',
        width: btnW,
        height: btnH,
        fill: P.pink,
        fontSize: 26 * s,
        onClick: () =>
          this.scene.start('Game', {
            characterId: this.payload.characterId,
            levelId: this.payload.levelId,
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
  }
}
