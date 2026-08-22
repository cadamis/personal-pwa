import Phaser from 'phaser'
import { ART_SCALE } from '../art/textures'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../data/characters'
import { ENEMIES } from '../data/enemies'
import { LEVELS, LEVEL_IDS, type LevelId } from '../data/levels'
import { WEAPONS } from '../data/weapons'
import { isLevelUnlocked, loadSave, tryUnlockCharacter, writeSave, type SaveData } from '../game/save'
import { Button } from '../ui/Button'
import { rebuildOnResize, uiScale } from '../ui/layout'
import { drawMenuBackdrop, drawPanel, textStyle } from '../ui/theme'

/** Title screen and friend-picker. */
export class MenuScene extends Phaser.Scene {
  private save: SaveData = loadSave()
  private index = 0
  private levelId: LevelId = 'meadow'
  private root!: Phaser.GameObjects.Container

  constructor() {
    super('Menu')
  }

  create(): void {
    this.save = loadSave()
    this.index = Math.max(0, CHARACTER_IDS.indexOf(this.save.lastCharacter))
    this.levelId = this.save.lastLevel
    this.root = this.add.container(0, 0)
    this.build()
    rebuildOnResize(this, () => this.rebuild())
    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => sfx.unlock())

    // Keyboard shortcuts for playing at a desk: arrows to browse the roster,
    // Enter or Space to start.
    const kb = this.input.keyboard
    kb?.on('keydown-LEFT', () => this.step(-1))
    kb?.on('keydown-RIGHT', () => this.step(1))
    kb?.on('keydown-ENTER', () => this.confirm())
    kb?.on('keydown-SPACE', () => this.confirm())
  }

  private rebuild(): void {
    this.root.removeAll(true)
    this.build()
  }

  private get selectedId(): CharacterId {
    return CHARACTER_IDS[this.index]
  }

  /** Moves along the roster by `dir`, wrapping around. */
  private step(dir: number): void {
    this.index = (this.index + dir + CHARACTER_IDS.length) % CHARACTER_IDS.length
    sfx.unlock()
    sfx.play('tap')
    this.rebuild()
  }

  /** What the big button does: play, or buy the friend you're looking at. */
  private confirm(): void {
    sfx.unlock()
    if (this.save.unlocked.includes(this.selectedId)) this.startRun()
    else this.unlock(this.selectedId)
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

    // Drifting sparkles, purely for the vibe.
    for (let i = 0; i < 16; i++) {
      const star = add(
        this.add
          .image(Math.random() * w, Math.random() * h, 'fx-star')
          .setScale(ART_SCALE * (0.4 + Math.random() * 0.7))
          .setAlpha(0.25 + Math.random() * 0.4),
      )
      this.tweens.add({
        targets: star,
        y: star.y - 30 - Math.random() * 50,
        alpha: 0.1,
        duration: 3000 + Math.random() * 4000,
        repeat: -1,
        yoyo: true,
        delay: Math.random() * 2000,
      })
    }

    // ------------------------------------------------------------- top strip
    add(
      this.add
        .text(w - 16 * s, 14 * s, `🍬 ${this.save.sprinkles}`, textStyle({ size: 26 * s, color: P.lemon, bold: true }))
        .setOrigin(1, 0),
    )
    const muteButton = add(
      this.add
        .text(16 * s, 14 * s, sfx.isMuted ? '🔇' : '🔊', textStyle({ size: 28 * s }))
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true }),
    )
    muteButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.save = { ...this.save, muted: !this.save.muted }
      sfx.setMuted(this.save.muted)
      writeSave(this.save)
      muteButton.setText(this.save.muted ? '🔇' : '🔊')
      sfx.unlock()
      sfx.play('tap')
    })

    if (this.save.runs > 0) {
      const best = `Best: ${formatTime(this.save.bestTimeSec)}  ·  ${this.save.bestKills} squished${
        this.save.wins > 0 ? `  ·  ${this.save.wins}× 👑` : ''
      }`
      add(
        this.add
          .text(w / 2, 18 * s, best, textStyle({ size: 17 * s, color: P.lavender }))
          .setOrigin(0.5, 0),
      )
    }

    // ----------------------------------------------------------------- title
    const titleY = h * 0.155
    const title = add(
      this.add
        .text(w / 2, titleY, 'Cuteness', textStyle({ size: 62 * s, color: P.pink, stroke: P.white, strokeWidth: 8 * s, bold: true }))
        .setOrigin(0.5),
    )
    const title2 = add(
      this.add
        .text(w / 2, titleY + 52 * s, 'OVERLOAD', textStyle({ size: 44 * s, color: P.lemon, stroke: P.ink, strokeWidth: 7 * s, bold: true }))
        .setOrigin(0.5),
    )
    this.tweens.add({
      targets: [title, title2],
      y: '-=7',
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // --------------------------------------------------------------- buttons
    // Sized and positioned before the panel: the buttons and the hint line are
    // anchored to the bottom edge, and the panel then centres itself in
    // whatever is left, so a tall portrait screen doesn't leave a hole in the
    // middle.
    const btnW = Math.min(300 * s, w * 0.62)
    const btnH = Math.min(66 * s, h * 0.11)
    const shopH = btnH * 0.78
    const hintH = 24 * s
    const shopY = h - hintH - shopH / 2 - 6 * s
    const btnY = shopY - shopH / 2 - btnH / 2 - 12 * s
    const levelRowH = 56 * s
    const levelRowY = btnY - btnH / 2 - levelRowH / 2 - 10 * s

    // ------------------------------------------------------- character panel
    const def = CHARACTERS[this.selectedId]
    const unlocked = this.save.unlocked.includes(def.id)
    const panelW = Math.min(w - 40 * s, 520 * s)
    const panelX = w / 2 - panelW / 2
    const titleBottom = titleY + 84 * s
    const panelSpace = levelRowY - levelRowH / 2 - 18 * s - titleBottom
    // Clamped to the space actually left over: unclamped, a short screen grew the
    // panel straight down through the level picker.
    const panelH = Math.min(h * 0.4, 250 * s, Math.max(120 * s, panelSpace))
    const panelY = titleBottom + Math.max(0, (panelSpace - panelH) / 2)
    const panel = add(this.add.graphics())
    drawPanel(panel, panelX, panelY, panelW, panelH, { fill: P.panel, edge: P.panelEdge })

    const portrait = add(
      this.add
        .image(panelX + panelW * 0.21, panelY + panelH * 0.47, def.texture)
        .setScale(ART_SCALE * Math.min(3.6 * s, (panelH * 0.5) / 22))
        .setAlpha(unlocked ? 1 : 0.35),
    )
    this.tweens.add({
      targets: portrait,
      y: portrait.y - 6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    if (!unlocked) {
      add(this.add.text(portrait.x, portrait.y, '🔒', textStyle({ size: 46 * s })).setOrigin(0.5))
    }

    const textX = panelX + panelW * 0.4
    const textW = panelW * 0.55
    add(
      this.add
        .text(textX, panelY + panelH * 0.16, def.name, textStyle({ size: 34 * s, color: P.purple, bold: true }))
        .setOrigin(0, 0.5),
    )
    add(
      this.add
        .text(textX, panelY + panelH * 0.32, def.title, textStyle({ size: 19 * s, color: P.inkSoft }))
        .setOrigin(0, 0.5),
    )
    add(
      this.add
        .text(textX, panelY + panelH * 0.52, def.perk, textStyle({ size: 18 * s, color: P.ink, wrap: textW, align: 'left' }))
        .setOrigin(0, 0.5),
    )
    add(
      this.add
        .text(
          textX,
          panelY + panelH * 0.8,
          `Starts with ${WEAPONS[def.startWeapon].icon} ${WEAPONS[def.startWeapon].name}`,
          textStyle({ size: 17 * s, color: P.teal, wrap: textW, align: 'left' }),
        )
        .setOrigin(0, 0.5),
    )

    // Left / right pickers
    const arrowY = panelY + panelH / 2
    for (const [dir, x] of [
      [-1, panelX - 26 * s],
      [1, panelX + panelW + 26 * s],
    ] as const) {
      const arrow = add(
        this.add
          .text(x, arrowY, dir < 0 ? '◀' : '▶', textStyle({ size: 40 * s, color: P.pink }))
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true }),
      )
      arrow.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.step(dir))
    }

    // Dots showing where you are in the roster
    CHARACTER_IDS.forEach((id, i) => {
      const owned = this.save.unlocked.includes(id)
      add(
        this.add
          .text(
            w / 2 + (i - (CHARACTER_IDS.length - 1) / 2) * 22 * s,
            panelY + panelH + 18 * s,
            i === this.index ? '●' : owned ? '○' : '·',
            textStyle({ size: 20 * s, color: i === this.index ? P.pink : P.inkSoft }),
          )
          .setOrigin(0.5),
      )
    })

    // ------------------------------------------------------------ level picker
    const pickerW = Math.min(w - 32 * s, 460 * s)
    const cellW = (pickerW - 10 * s) / LEVEL_IDS.length
    LEVEL_IDS.forEach((id, i) => {
      const level = LEVELS[id]
      const open = isLevelUnlocked(this.save, id)
      const chosen = id === this.levelId
      const cx = w / 2 - pickerW / 2 + cellW / 2 + i * (cellW + 10 * s)
      const pill = add(this.add.container(cx, levelRowY))
      const bg = this.add.graphics()
      drawPanel(bg, -cellW / 2, -levelRowH / 2, cellW, levelRowH, {
        fill: chosen ? P.lemon : P.nightSoft,
        edge: chosen ? P.gold : P.inkSoft,
        radius: 14 * s,
        shadow: false,
      })
      pill.add(bg)
      pill.add(
        this.add
          .text(
            0,
            -levelRowH * 0.14,
            `${open ? level.icon : '🔒'} ${level.name}`,
            textStyle({ size: Math.min(18 * s, cellW * 0.11), color: chosen ? P.ink : P.white, bold: true }),
          )
          .setOrigin(0.5),
      )
      pill.add(
        this.add
          .text(
            0,
            levelRowH * 0.24,
            open ? level.blurb : `Beat ${ENEMIES[LEVELS[level.unlockedBy!].boss].name} to open this up!`,
            textStyle({
              size: Math.min(11 * s, cellW * 0.065),
              color: chosen ? P.inkSoft : P.lavender,
              wrap: cellW - 14 * s,
            }),
          )
          .setOrigin(0.5),
      )
      if (open) {
        pill.setSize(cellW, levelRowH)
        pill.setInteractive(new Phaser.Geom.Rectangle(0, 0, cellW, levelRowH), Phaser.Geom.Rectangle.Contains)
        pill.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
          if (this.levelId === id) return
          this.levelId = id
          sfx.unlock()
          sfx.play('tap')
          this.rebuild()
        })
      } else {
        pill.setAlpha(0.75)
      }
    })

    if (unlocked) {
      add(
        new Button(this, w / 2, btnY, {
          label: 'PLAY!',
          width: btnW,
          height: btnH,
          fill: P.pink,
          fontSize: 34 * s,
          onClick: () => this.startRun(),
        }),
      )
    } else {
      const affordable = this.save.sprinkles >= def.unlockCost
      add(
        new Button(this, w / 2, btnY, {
          label: `Unlock ${def.name}`,
          sub: `🍬 ${def.unlockCost}`,
          width: btnW,
          height: btnH,
          fill: affordable ? P.lemon : P.grumpGrey,
          fontSize: 26 * s,
          onClick: () => this.unlock(def.id),
        }).setEnabled(affordable),
      )
    }

    add(
      new Button(this, w / 2, shopY, {
        label: '🍬 Sprinkle Shop',
        width: btnW,
        height: shopH,
        fill: P.lavender,
        fontSize: 22 * s,
        onClick: () => this.scene.start('Shop'),
      }),
    )

    add(
      this.add
        .text(
          w / 2,
          h - 6 * s,
          'Drag anywhere to move — attacking happens all by itself!',
          textStyle({ size: 15 * s, color: P.lavender, wrap: w - 40 }),
        )
        .setOrigin(0.5, 1),
    )
  }

  private unlock(id: CharacterId): void {
    const next = tryUnlockCharacter(this.save, id)
    if (!next) return
    this.save = next
    writeSave(this.save)
    sfx.play('levelup')
    this.rebuild()
  }

  private startRun(): void {
    this.save = { ...this.save, lastCharacter: this.selectedId, lastLevel: this.levelId }
    writeSave(this.save)
    this.scene.start('Game', { characterId: this.selectedId, levelId: this.levelId })
  }
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
