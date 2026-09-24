import Phaser from 'phaser'
import { artScale, ART_SCALE } from '../art/textures'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../data/characters'
import { STICKERS, characterUnlockSticker } from '../data/stickers'
import { WEAPONS } from '../data/weapons'
import { awardStickers, isCharacterForSale, loadSave, tryUnlockCharacter, writeSave, type SaveData } from '../game/save'
import { Button } from '../ui/Button'
import { rebuildOnResize, uiScale } from '../ui/layout'
import { drawCard, drawMenuBackdrop, textStyle } from '../ui/theme'

/** Title screen and friend-picker. */
export class MenuScene extends Phaser.Scene {
  private save: SaveData = loadSave()
  private index = 0
  private root!: Phaser.GameObjects.Container
  /** Stickers handed out on arrival (back-filled from old records), to announce once. */
  private arrivalStickers = 0

  constructor() {
    super('Menu')
  }

  create(): void {
    this.save = loadSave()
    // A returning player's records may already earn stickers they've never
    // seen (they didn't exist last time they played). Hand them out now.
    const awarded = awardStickers(this.save)
    this.arrivalStickers = awarded.earned.length
    if (awarded.earned.length > 0) {
      this.save = awarded.save
      writeSave(this.save)
    }
    this.index = Math.max(0, CHARACTER_IDS.indexOf(this.save.lastCharacter))
    this.root = this.add.container(0, 0)
    this.build()
    rebuildOnResize(this, () => this.rebuild())
    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => sfx.unlock())

    // Keyboard shortcuts for playing at a desk: arrows to browse the roster,
    // Enter or Space to go.
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
    if (this.save.unlocked.includes(this.selectedId)) this.choose()
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
    for (let i = 0; i < 18; i++) {
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
      const crowns = Object.values(this.save.levelWins).reduce((sum, n) => sum + (n ?? 0), 0)
      const best = `Best: ${formatTime(this.save.bestTimeSec)}  ·  ${this.save.bestKills} squished${crowns > 0 ? `  ·  ${crowns}× 👑` : ''}`
      add(
        this.add
          .text(w / 2, 18 * s, best, textStyle({ size: 16 * s, color: P.lavender }))
          .setOrigin(0.5, 0),
      )
    }

    // ----------------------------------------------------------------- title
    const titleY = h * 0.14
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
    const btnW = Math.min(320 * s, w * 0.7)
    const btnH = Math.min(66 * s, h * 0.1)
    const smallH = btnH * 0.8
    const hintH = 24 * s
    const smallY = h - hintH - smallH / 2 - 6 * s
    const btnY = smallY - smallH / 2 - btnH / 2 - 12 * s

    // ------------------------------------------------------- character panel
    const def = CHARACTERS[this.selectedId]
    const unlocked = this.save.unlocked.includes(def.id)
    const panelW = Math.min(w - 80 * s, 540 * s)
    const panelX = w / 2 - panelW / 2
    const titleBottom = titleY + 84 * s
    const panelSpace = btnY - btnH / 2 - 40 * s - titleBottom
    // Clamped to the space actually left over: unclamped, a short screen grew the
    // panel straight down through the buttons.
    // Taller in portrait, where there's room to spare below the title.
    const panelH = Math.min(h * 0.42, (h > w ? 340 : 260) * s, Math.max(120 * s, panelSpace))
    const panelY = titleBottom + Math.max(0, (panelSpace - panelH) / 2)
    const panel = add(this.add.graphics())
    drawCard(panel, panelX, panelY, panelW, panelH, { fill: P.panel, edge: unlocked ? P.panelEdge : P.grumpGrey })

    // A soft spotlight behind the portrait.
    const spot = add(this.add.graphics())
    spot.fillStyle(unlocked ? P.pink : P.grumpGrey, 0.35)
    spot.fillCircle(panelX + panelW * 0.21, panelY + panelH * 0.5, Math.min(panelW * 0.17, panelH * 0.38))
    const portrait = add(
      this.add
        .image(panelX + panelW * 0.21, panelY + panelH * 0.47, def.texture)
        .setScale(artScale(def.texture) * Math.min(3.6 * s, (panelH * 0.52) / 22))
        .setAlpha(unlocked ? 1 : 0.4),
    )
    if (!unlocked) portrait.setTint(0x9a90b0)
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
    const textW = panelW * 0.56
    add(
      this.add
        .text(textX, panelY + panelH * 0.16, def.name, textStyle({ size: 34 * s, color: P.purple, bold: true }))
        .setOrigin(0, 0.5),
    )
    add(
      this.add
        .text(textX, panelY + panelH * 0.31, def.title, textStyle({ size: 18 * s, color: P.inkSoft }))
        .setOrigin(0, 0.5),
    )
    add(
      this.add
        .text(textX, panelY + panelH * 0.52, def.perk, textStyle({ size: 17 * s, color: P.ink, wrap: textW, align: 'left' }))
        .setOrigin(0, 0.5),
    )
    add(
      this.add
        .text(
          textX,
          panelY + panelH * 0.8,
          `Starts with ${WEAPONS[def.startWeapon].icon} ${WEAPONS[def.startWeapon].name}`,
          textStyle({ size: 16 * s, color: P.teal, wrap: textW, align: 'left', bold: true }),
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
            w / 2 + (i - (CHARACTER_IDS.length - 1) / 2) * 20 * s,
            panelY + panelH + 18 * s,
            i === this.index ? '●' : owned ? '○' : '·',
            textStyle({ size: 20 * s, color: i === this.index ? P.pink : P.inkSoft }),
          )
          .setOrigin(0.5),
      )
    })

    if (unlocked) {
      add(
        new Button(this, w / 2, btnY, {
          label: 'PLAY!',
          width: btnW,
          height: btnH,
          fill: P.pink,
          fontSize: 34 * s,
          onClick: () => this.choose(),
        }),
      )
    } else if (isCharacterForSale(def.id)) {
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
    } else {
      // Friends that come off a sticker: say which one.
      const sticker = characterUnlockSticker(def.id)
      const sdef = sticker ? STICKERS[sticker] : null
      add(
        new Button(this, w / 2, btnY, {
          label: sdef ? `${sdef.icon} ${sdef.name}` : 'Locked',
          sub: sdef ? sdef.desc : '',
          width: btnW * 1.1,
          height: btnH,
          fill: P.grumpGrey,
          fontSize: 20 * s,
          onClick: () => undefined,
        }).setEnabled(false),
      )
    }

    const smallW = (btnW - 12 * s) / 2
    add(
      new Button(this, w / 2 - smallW / 2 - 6 * s, smallY, {
        label: '🍬 Shop',
        width: smallW,
        height: smallH,
        fill: P.lavender,
        fontSize: 21 * s,
        onClick: () => this.scene.start('Shop'),
      }),
    )
    const newCount = this.save.newStickers.length
    add(
      new Button(this, w / 2 + smallW / 2 + 6 * s, smallY, {
        label: '📖 Stickers',
        width: smallW,
        height: smallH,
        fill: P.mint,
        fontSize: 21 * s,
        onClick: () => this.scene.start('StickerBook'),
      }),
    )
    if (newCount > 0) {
      const badgeX = w / 2 + smallW + 6 * s - 6 * s
      const badgeY = smallY - smallH / 2 + 2 * s
      const badge = add(this.add.graphics())
      badge.fillStyle(P.pinkHot, 1)
      badge.fillCircle(badgeX, badgeY, 13 * s)
      badge.lineStyle(2.5 * s, P.white, 1)
      badge.strokeCircle(badgeX, badgeY, 13 * s)
      const label = add(this.add.text(badgeX, badgeY, `${newCount}`, textStyle({ size: 15 * s, color: P.white, bold: true })).setOrigin(0.5))
      this.tweens.add({ targets: [label], scale: 1.2, duration: 500, yoyo: true, repeat: -1 })
    }

    add(
      this.add
        .text(
          w / 2,
          h - 6 * s,
          this.arrivalStickers > 0
            ? `✨ You earned ${this.arrivalStickers} sticker${this.arrivalStickers === 1 ? '' : 's'}! Open the Sticker Book! ✨`
            : 'Drag anywhere to move — attacking happens all by itself!',
          textStyle({ size: 15 * s, color: this.arrivalStickers > 0 ? P.lemon : P.lavender, wrap: w - 40, bold: this.arrivalStickers > 0 }),
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

  /** Picks this friend and moves on to choosing where to play. */
  private choose(): void {
    this.save = { ...this.save, lastCharacter: this.selectedId }
    writeSave(this.save)
    this.scene.start('StageSelect', { characterId: this.selectedId })
  }
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
