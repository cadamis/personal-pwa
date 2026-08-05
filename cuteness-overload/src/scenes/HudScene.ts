import Phaser from 'phaser'
import { ART_SCALE } from '../art/textures'
import { P } from '../art/palette'
import { Joystick } from '../ui/Joystick'
import { rebuildOnResize, uiScale } from '../ui/layout'
import { drawBar, drawPanel, textStyle } from '../ui/theme'
import { formatTime } from './MenuScene'
import type { GameScene, RunUiState } from './GameScene'

/** Shared zero vector, so the movement getter never allocates on the hot path. */
const NO_MOVEMENT = { x: 0, y: 0 }

// XP bar geometry, in design units (multiplied by the UI scale at layout time).
const XP_PAD = 12
const XP_Y = 8
const XP_H = 22
/** Space kept clear on the right for the pause button. */
const XP_RIGHT_GAP = 62
/** Diameter of the off-screen boss badge, in design units. */
const BOSS_BADGE = 40
/**
 * Pause button centre. Sits a little below the XP bar's centre line so a 42-unit
 * button doesn't hang off the top of the screen.
 */
const PAUSE_Y = 27

/**
 * The HUD and the touch stick live in their own scene so they can render at 1:1
 * while the game camera zooms. Keeping a zoom-compensated UI layer inside the
 * game scene means fighting the camera matrix on every single element.
 *
 * It reads {@link GameScene.ui} once per frame rather than listening for events —
 * the HUD is a view of the run's state, and there's nothing to miss between
 * frames.
 */
export class HudScene extends Phaser.Scene {
  // Optional rather than definite-assigned: the GameScene runs one frame before
  // this scene's create() lands, and it asks for the stick on that first frame.
  private stick?: Joystick
  private bars?: Phaser.GameObjects.Graphics
  private hpText?: Phaser.GameObjects.Text
  private timeText?: Phaser.GameObjects.Text
  private killText?: Phaser.GameObjects.Text
  private sprinkleText?: Phaser.GameObjects.Text
  private xpLevelText?: Phaser.GameObjects.Text
  private xpValueText?: Phaser.GameObjects.Text
  private bossText?: Phaser.GameObjects.Text
  private banner?: Phaser.GameObjects.Text
  private weaponRow?: Phaser.GameObjects.Container
  private bossPointer?: Phaser.GameObjects.Container
  private bossPointerFace?: Phaser.GameObjects.Image
  private bossPointerArrow?: Phaser.GameObjects.Image
  private root?: Phaser.GameObjects.Container

  private s = 1
  private weaponSignature = ''
  private lastHp = ''
  private lastTime = ''
  private lastKills = ''
  private lastSprinkles = ''
  private lastLevel = ''
  private lastXp = ''

  constructor() {
    super('Hud')
  }

  get moveVector(): { x: number; y: number } {
    return this.stick?.vector ?? NO_MOVEMENT
  }

  setStickEnabled(enabled: boolean): void {
    if (!this.stick) return
    this.stick.enabled = enabled
    if (!enabled) this.stick.release()
  }

  create(): void {
    this.root = this.add.container(0, 0)
    this.stick = new Joystick(this, 62, 84)
    this.build()
    rebuildOnResize(this, () => {
      this.root?.removeAll(true)
      this.build()
    })
  }

  private get run(): GameScene {
    return this.scene.get<GameScene>('Game')
  }

  private build(): void {
    const root = this.root
    if (!root) return
    const w = this.scale.width
    const s = uiScale(this)
    this.s = s
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      root.add(obj)
      return obj
    }

    this.bars = add(this.add.graphics().setDepth(800))

    // The XP bar is the widest, tallest thing up here and carries its own
    // labels: an unlabelled sliver at the very top edge reads as decoration
    // rather than progress.
    this.xpLevelText = add(
      this.add
        .text(XP_PAD * s + 12 * s, XP_Y * s + (XP_H * s) / 2, 'LEVEL 1', textStyle({ size: 15 * s, color: P.white, stroke: P.night, strokeWidth: 4 * s, bold: true }))
        .setOrigin(0, 0.5)
        .setDepth(802),
    )
    this.xpValueText = add(
      this.add
        .text(w - XP_RIGHT_GAP * s - 10 * s, XP_Y * s + (XP_H * s) / 2, '', textStyle({ size: 13 * s, color: P.white, stroke: P.night, strokeWidth: 3 * s, bold: true }))
        .setOrigin(1, 0.5)
        .setDepth(802),
    )

    this.hpText = add(
      this.add
        .text(XP_PAD * s + 8 * s, 50 * s, '', textStyle({ size: 14 * s, color: P.white, stroke: P.night, strokeWidth: 4 * s, bold: true }))
        .setOrigin(0, 0.5)
        .setDepth(802),
    )
    this.timeText = add(
      this.add
        .text(w / 2, 36 * s, '0:00', textStyle({ size: 28 * s, color: P.white, stroke: P.night, strokeWidth: 5 * s, bold: true }))
        .setOrigin(0.5, 0)
        .setDepth(802),
    )
    this.killText = add(
      this.add
        .text(w / 2, 70 * s, '', textStyle({ size: 15 * s, color: P.lemon, stroke: P.night, strokeWidth: 4 * s }))
        .setOrigin(0.5, 0)
        .setDepth(802),
    )
    this.sprinkleText = add(
      this.add
        .text(w - XP_PAD * s, 64 * s, '', textStyle({ size: 20 * s, color: P.lemon, stroke: P.night, strokeWidth: 4 * s, bold: true }))
        .setOrigin(1, 0.5)
        .setDepth(802),
    )
    this.bossText = add(
      this.add
        .text(w / 2, 96 * s, '', textStyle({ size: 15 * s, color: P.white, stroke: P.night, strokeWidth: 4 * s, bold: true }))
        .setOrigin(0.5, 0)
        .setDepth(802)
        .setVisible(false),
    )

    this.weaponRow = add(this.add.container(XP_PAD * s + 4 * s, 76 * s).setDepth(802))
    this.weaponSignature = ''

    this.banner = add(
      this.add
        .text(w / 2, this.scale.height * 0.26, '', textStyle({ size: 34 * s, color: P.white, stroke: P.night, strokeWidth: 7 * s, bold: true, align: 'center', wrap: w * 0.9 }))
        .setOrigin(0.5)
        .setDepth(850)
        .setAlpha(0),
    )

    // Pause button, deliberately inside the HUD strip so tapping it never grabs
    // the movement stick.
    const pauseSize = 42 * s
    const hit = pauseSize + 12 * s
    const pause = add(this.add.container(w - 28 * s, PAUSE_Y * s).setDepth(803))
    const pauseBg = this.add.graphics()
    drawPanel(pauseBg, -pauseSize / 2, -pauseSize / 2, pauseSize, pauseSize, {
      fill: P.panel,
      edge: P.panelEdge,
      radius: 12 * s,
      shadow: false,
    })
    pause.add(pauseBg)
    pause.add(this.add.text(0, 0, '❚❚', textStyle({ size: 17 * s, color: P.purple, bold: true })).setOrigin(0.5))
    pause.setSize(hit, hit)
    pause.setInteractive(new Phaser.Geom.Rectangle(0, 0, hit, hit), Phaser.Geom.Rectangle.Contains)
    pause.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.run.requestPause())

    // Off-screen boss pointer: the play field is far bigger than the screen, so
    // without this a boss can wander off and simply be lost.
    const badge = BOSS_BADGE * s
    this.bossPointer = add(this.add.container(0, 0).setDepth(806).setVisible(false))
    const disc = this.add.graphics()
    disc.fillStyle(P.night, 0.65)
    disc.fillCircle(0, 0, badge * 0.62)
    disc.lineStyle(3 * s, P.gold, 0.95)
    disc.strokeCircle(0, 0, badge * 0.62)
    this.bossPointer.add(disc)
    this.bossPointerFace = this.add.image(0, 0, 'foe-fluffington').setDisplaySize(badge, badge)
    this.bossPointer.add(this.bossPointerFace)
    this.bossPointerArrow = this.add.image(0, 0, 'ui-pointer').setScale(ART_SCALE * 1.1 * s)
    this.bossPointer.add(this.bossPointerArrow)
    this.tweens.add({
      targets: this.bossPointer,
      scale: 1.12,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Keep the stick out of the HUD strip now that it is taller.
    if (this.stick) this.stick.deadTop = 96 * s

    // Force a repaint of the cached text values after a rebuild.
    this.lastHp = ''
    this.lastTime = ''
    this.lastKills = ''
    this.lastSprinkles = ''
    this.lastLevel = ''
    this.lastXp = ''
  }

  showBanner(message: string, color: number): void {
    const banner = this.banner
    if (!banner) return
    banner.setText(message)
    banner.setColor(`#${color.toString(16).padStart(6, '0')}`)
    banner.setAlpha(0).setScale(0.7)
    this.tweens.killTweensOf(banner)
    this.tweens.add({
      targets: banner,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: banner, alpha: 0, duration: 500, delay: 1500 })
      },
    })
  }

  override update(): void {
    const bars = this.bars
    const bossText = this.bossText
    if (!bars || !bossText) return
    const state = this.run.ui
    const s = this.s
    const w = this.scale.width

    // XP bar across the top (clear of the pause button), HP bar beneath it.
    const xpW = w - XP_PAD * s - XP_RIGHT_GAP * s
    bars.clear()
    drawBar(bars, XP_PAD * s, XP_Y * s, xpW, XP_H * s, state.xpFrac, P.lemon, {
      track: P.night,
      border: P.white,
    })
    drawBar(bars, XP_PAD * s, 42 * s, 180 * s, 16 * s, state.hp / state.maxHp, P.pinkHot, {
      track: P.night,
      border: P.white,
    })

    this.setCached('lastLevel', `LEVEL ${state.level}`, this.xpLevelText)
    this.setCached('lastXp', `${state.xp} / ${state.xpNeeded} XP`, this.xpValueText)
    this.setCached('lastHp', `${Math.ceil(state.hp)} / ${Math.round(state.maxHp)}`, this.hpText)
    this.setCached('lastTime', formatTime(state.timeSec), this.timeText)
    this.setCached('lastKills', `${state.kills} squished`, this.killText)
    this.setCached('lastSprinkles', `\u{1F36C} ${state.sprinkles}`, this.sprinkleText)

    if (state.boss) {
      bossText.setVisible(true).setText(state.boss.name)
      drawBar(bars, w * 0.2, 118 * s, w * 0.6, 14 * s, state.boss.frac, P.grumpRed, {
        track: P.night,
        border: P.white,
      })
    } else if (bossText.visible) {
      bossText.setVisible(false)
    }

    this.syncBossPointer(state)
    this.syncWeaponRow(state)
  }

  /**
   * Parks a badge on the edge of the screen pointing at an off-screen boss.
   *
   * The clamp rectangle is inset further at the top than elsewhere so the badge
   * never lands under the XP bar, which means it can't be a simple "scale the
   * direction vector" — it's a ray/rectangle intersection from the screen centre.
   */
  private syncBossPointer(state: RunUiState): void {
    const pointer = this.bossPointer
    const face = this.bossPointerFace
    const arrow = this.bossPointerArrow
    if (!pointer || !face || !arrow) return

    const boss = state.boss
    if (!boss || boss.onScreen) {
      if (pointer.visible) pointer.setVisible(false)
      return
    }

    const s = this.s
    const w = this.scale.width
    const h = this.scale.height
    const cx = w / 2
    const cy = h / 2
    let dx = boss.screenX - cx
    let dy = boss.screenY - cy
    const length = Math.hypot(dx, dy)
    if (length < 1) {
      if (pointer.visible) pointer.setVisible(false)
      return
    }
    dx /= length
    dy /= length

    const edge = BOSS_BADGE * s
    const left = edge
    const right = w - edge
    const top = 118 * s // clear of the XP bar, HP bar and boss health bar
    const bottom = h - edge
    const tx = dx > 0 ? (right - cx) / dx : dx < 0 ? (left - cx) / dx : Infinity
    const ty = dy > 0 ? (bottom - cy) / dy : dy < 0 ? (top - cy) / dy : Infinity
    const t = Math.max(0, Math.min(tx, ty))

    pointer.setVisible(true).setPosition(cx + dx * t, cy + dy * t)
    face.setTexture(boss.texture).setDisplaySize(BOSS_BADGE * s, BOSS_BADGE * s)
    arrow.setRotation(Math.atan2(dy, dx)).setPosition(dx * edge * 0.78, dy * edge * 0.78)
  }

  /** Only pushes text into a Text object when it actually changed. */
  private setCached(
    field: 'lastHp' | 'lastTime' | 'lastKills' | 'lastSprinkles' | 'lastLevel' | 'lastXp',
    value: string,
    target: Phaser.GameObjects.Text | undefined,
  ): void {
    if (!target || this[field] === value) return
    this[field] = value
    target.setText(value)
  }

  private syncWeaponRow(state: RunUiState): void {
    const row = this.weaponRow
    if (!row) return
    const signature = state.weapons.map((weapon) => `${weapon.icon}${weapon.level}`).join('')
    if (signature === this.weaponSignature) return
    this.weaponSignature = signature

    row.removeAll(true)
    const s = this.s
    state.weapons.forEach((weapon, i) => {
      const x = i * 40 * s
      row.add(this.add.text(x, 0, weapon.icon, textStyle({ size: 25 * s })).setOrigin(0, 0.5))
      row.add(
        this.add
          .text(
            x + 27 * s,
            8 * s,
            `${weapon.level}`,
            textStyle({
              size: 14 * s,
              color: weapon.level >= weapon.max ? P.gold : P.white,
              stroke: P.night,
              strokeWidth: 3 * s,
              bold: true,
            }),
          )
          .setOrigin(0, 0.5),
      )
    })
  }
}
