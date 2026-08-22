/**
 * The opening cinematic: hunters close in, the ground gives way, and she wakes
 * up at the bottom of it — which is where the game starts.
 *
 * Composed on a fixed {@link STAGE_W} × {@link STAGE_H} stage that's scaled to
 * cover the viewport, so every position in here is authored once and holds on
 * any screen. Resizing re-fits the stage; it doesn't restage the animation.
 *
 * Timing lives in [introScript.ts](../game/introScript.ts) as absolute start
 * times, and each beat hangs off its own timer. That's what makes skipping
 * simple: cancel the timers, kill the tweens, go.
 */
import Phaser from 'phaser'
import { P } from '../art/palette'
import { HUNTER_FOOT, hunterKey, type HunterKind } from '../art/introArt'
import { seededRandom } from '../art/draw'
import { SHEETS, animKey, type Facing } from '../art/sheets'
import { groundKey } from '../art/worldArt'
import { readSlot } from '../game/save'
import {
  BEATS,
  STAGE_H,
  STAGE_W,
  beatSchedule,
  RING,
  hunterMarks,
  type BeatId,
  type HunterMark,
} from '../game/introScript'
import type { HumanoidId } from '../game/forms'
import { textStyle } from '../ui/theme'

/** How tall the character is drawn, relative to her in-game size. */
const CHAR_ZOOM = 2.6
const HUNTER_SCALE = 1
/** How far the camera creeps in over the opening beat. */
const PUSH_IN = 1.09
/** Ground level on the stage, in stage coordinates from centre. */
const GROUND_Y = 40

interface HunterRig {
  body: Phaser.GameObjects.Image
  flame: Phaser.GameObjects.Image
  glow: Phaser.GameObjects.Image
  mark: HunterMark
}

const HUNTER_KIT: HunterKind[] = ['torch', 'spear', 'torch', 'bow', 'torch', 'spear']

export class IntroScene extends Phaser.Scene {
  private stage!: Phaser.GameObjects.Container
  /** Inside the stage; carries the push-in, so it can't fight the cover fit. */
  private world!: Phaser.GameObjects.Container
  private surface!: Phaser.GameObjects.Container
  private shaft!: Phaser.GameObjects.Container
  private landing!: Phaser.GameObjects.Container
  private fx!: Phaser.GameObjects.Container

  private character!: Phaser.GameObjects.Sprite
  private hunters: HunterRig[] = []
  private pit!: Phaser.GameObjects.Image
  private shaftWall!: Phaser.GameObjects.TileSprite
  private skyHole!: Phaser.GameObjects.Image
  private streaks: Phaser.GameObjects.Image[] = []
  private form: HumanoidId = 'fmc'
  private slotIndex = 0
  private finished = false

  constructor() {
    super('intro')
  }

  init(data: { slot?: number }): void {
    this.slotIndex = data.slot ?? 0
  }

  create(): void {
    // The character whose slot this is stars in their own origin story.
    this.form = readSlot(this.slotIndex)?.humanoid ?? 'fmc'
    this.finished = false
    this.cameras.main.setBackgroundColor(P.void)

    this.stage = this.add.container(0, 0)
    this.world = this.add.container(0, 0)
    this.stage.add(this.world)

    this.surface = this.add.container(0, 0)
    this.shaft = this.add.container(0, 0).setVisible(false)
    this.landing = this.add.container(0, 0).setVisible(false)
    this.fx = this.add.container(0, 0)

    // Before the sets: the hunter ring is clamped against the fitted stage.
    this.fitStage()
    this.buildSurface()
    this.buildShaft()
    this.buildLanding()
    this.buildCharacter()
    // Order is the depth order: she reads over the sets, effects over her.
    this.world.add([this.surface, this.shaft, this.landing, this.character, this.fx])

    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitStage, this)

    for (const beat of beatSchedule(BEATS)) {
      this.time.delayedCall(beat.start, () => this.runBeat(beat.id))
    }
    this.time.delayedCall(this.introEnd(), () => this.finish(700))

    this.addSkip()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitStage, this)
    })
  }

  override update(): void {
    // The hunters' torches ride along with whatever is tweening the body, which
    // is cheaper and far less error-prone than tweening three objects in step.
    for (const rig of this.hunters) {
      if (!rig.flame.visible) continue
      const dir = rig.body.flipX ? -1 : 1
      const x = rig.body.x + dir * 33 * HUNTER_SCALE
      const y = rig.body.y - 116 * HUNTER_SCALE
      rig.flame.setPosition(x, y)
      rig.glow.setPosition(x, y)
    }
  }

  // ------------------------------------------------------------------ layout

  /**
   * Scales the stage so it shows a constant *area* of scene, whatever the
   * aspect ratio.
   *
   * A plain `cover` fit (`max(w/W, h/H)`) fills the frame but crops hard on the
   * narrow axis — in portrait it zoomed in far enough to put the whole ring of
   * hunters off the sides. Matching area instead trades a little width for
   * height as the screen gets taller, which keeps the staging intact, and the
   * oversized backdrops still cover the frame at every aspect worth supporting.
   */
  private fitStage(): void {
    const { width, height } = this.scale
    this.stage.setScale(Math.sqrt((width * height) / (STAGE_W * STAGE_H)))
    // On a tall screen the extra room all lands in front of her, which is the
    // one part of the frame deliberately kept empty. Sit the action up a little
    // so the dead ground is shared between top and bottom.
    const tall = height / width > 1.2
    this.stage.setPosition(width / 2, height * (tall ? 0.44 : 0.5))
  }

  /** Half of the stage area actually on screen, in stage units. */
  private visibleHalf(): { x: number; y: number } {
    const scale = this.stage.scaleX
    return { x: this.scale.width / scale / 2, y: this.scale.height / scale / 2 }
  }

  private introEnd(): number {
    const schedule = beatSchedule(BEATS)
    return schedule[schedule.length - 1].end
  }

  // -------------------------------------------------------------------- sets

  private buildSurface(): void {
    // Oversized so a push-in never reaches the edge of the set.
    const ground = this.add
      .tileSprite(0, 0, STAGE_W * 1.6, STAGE_H * 1.6, groundKey('forest', 0))
      .setOrigin(0.5)
    const night = this.add
      .rectangle(0, 0, STAGE_W * 1.6, STAGE_H * 1.6, 0x0e1420, 0.52)
      .setOrigin(0.5)
    this.surface.add([ground, night])

    // A ragged treeline framing the shot, thinnest at the bottom so the ring of
    // torches reads against open ground. Bases sit high enough that the
    // canopies are in frame — trunks alone just look like a fence.
    const trees = [
      [-580, -140], [-400, -168], [-205, -132], [20, -175], [235, -138], [440, -170], [600, -135],
      [-640, 10], [640, 20], [-680, 150], [680, 160],
    ]
    for (const [x, y] of trees) {
      this.surface.add(
        this.add
          .image(x, y, Math.abs(x) > 560 ? 'tree-dead' : 'tree')
          .setOrigin(0.5, 1)
          .setScale(1.15)
          .setTint(0x3a4452)
          .setFlipX(x > 0),
      )
    }

    this.pit = this.add.image(0, GROUND_Y - 6, 'pit').setVisible(false)
    this.surface.add(this.pit)

    // Pull the ring in if the screen is too narrow or short to hold it, so
    // nobody ends up standing outside the frame on a tall display.
    const visible = this.visibleHalf()
    const ring = {
      ...RING,
      rx: Math.min(RING.rx, (visible.x - 70) / PUSH_IN),
      ry: Math.min(RING.ry, (visible.y - 130) / PUSH_IN),
      // What counts as "off screen" is this display, not the nominal stage.
      halfW: visible.x,
      halfH: visible.y,
    }
    const marks = hunterMarks(HUNTER_KIT.length, ring)
    this.hunters = marks.map((mark, i) => {
      const kind = HUNTER_KIT[i]
      const body = this.add
        .image(mark.startX, mark.startY + GROUND_Y, hunterKey(kind))
        .setOrigin(0.5, HUNTER_FOOT / 132)
        .setScale(HUNTER_SCALE)
        .setFlipX(mark.facing < 0)
      const glow = this.add
        .image(0, 0, 'glow')
        .setTint(P.fire)
        .setBlendMode(Phaser.BlendModes.ADD)
        // A pool of light on the ground, so the ring reads as light closing in
        // rather than six loose sprites. Kept dim on purpose: these are
        // additive and there are six of them, and at any real strength they
        // stack into daylight.
        .setScale(1.8)
        .setAlpha(kind === 'torch' ? 0.18 : 0)
        .setVisible(kind === 'torch')
      const flame = this.add
        .image(0, 0, 'flame')
        .setOrigin(0.5, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.62)
        .setVisible(kind === 'torch')
      this.surface.add([glow, body, flame])

      if (kind === 'torch') {
        this.tweens.add({
          targets: flame,
          scaleY: { from: 0.72, to: 1 },
          scaleX: { from: 0.95, to: 0.75 },
          duration: 260 + i * 37,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.13, to: 0.24 },
          duration: 700 + i * 53,
          yoyo: true,
          repeat: -1,
        })
      }
      return { body, flame, glow, mark }
    })
  }

  private buildShaft(): void {
    this.shaftWall = this.add
      .tileSprite(0, 0, STAGE_W * 1.6, STAGE_H * 1.6, 'shaft-wall')
      .setOrigin(0.5)
    // Darkness closing in from the sides of the hole.
    const walls = this.add
      .image(0, 0, 'vignette')
      .setTint(0x000000)
      .setAlpha(0.85)
      .setDisplaySize(STAGE_W * 1.7, STAGE_H * 1.7)
    this.skyHole = this.add.image(0, -60, 'sky-hole').setBlendMode(Phaser.BlendModes.ADD)
    // The hole goes on top of the closing darkness — behind it, the only thing
    // she can still see gets swallowed by the vignette it's meant to sit in.
    this.shaft.add([this.shaftWall, walls, this.skyHole])

    // Jittered off the even spacing, and each a different length — a tidy row
    // of identical lines reads as a grid laid over the shot, not as speed.
    const jitter = seededRandom(4711)
    this.streaks = Array.from({ length: 14 }, (_, i) => {
      const streak = this.add
        .image(-STAGE_W / 2 + ((i + jitter() * 0.9) / 14) * STAGE_W, 0, 'streak')
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(P.moonDim)
        .setScale(0.6 + jitter() * 0.8, 1.1 + jitter() * 1.4)
      this.shaft.add(streak)
      return streak
    })
  }

  private buildLanding(): void {
    const ground = this.add
      .tileSprite(0, 0, STAGE_W * 1.6, STAGE_H * 1.6, groundKey('grass', 0))
      .setOrigin(0.5)
    const night = this.add
      .rectangle(0, 0, STAGE_W * 1.6, STAGE_H * 1.6, 0x2a3550, 0.32)
      .setOrigin(0.5)
    this.landing.add([ground, night])

    // Same framing rule as the surface: bases low enough that the canopies are
    // in shot, rather than a row of trunk-bottoms along the top edge.
    for (const [x, y] of [[-540, -120], [-310, -152], [-85, -118], [190, -158], [430, -125], [620, -150]]) {
      this.landing.add(
        this.add.image(x, y, 'tree').setOrigin(0.5, 1).setScale(1.15).setTint(0x55636f).setFlipX(x > 0),
      )
    }

    // The campfire she'll come to know as home, already burning off to one side.
    const fireX = 250
    const fireY = GROUND_Y - 30
    const glow = this.add
      .image(fireX, fireY - 14, 'glow')
      .setTint(P.fire)
      // Additive, so it blows the whole right of the frame out at anything
      // stronger — and takes the fire's own logs and stones with it.
      .setAlpha(0.28)
      .setScale(2.3)
      .setBlendMode(Phaser.BlendModes.ADD)
    const logs = this.add.image(fireX, fireY, 'campfire').setOrigin(0.5, 1).setScale(1.4)
    const flame = this.add
      .image(fireX, fireY - 8, 'flame')
      .setOrigin(0.5, 1)
      .setScale(1.3)
      .setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({
      targets: flame,
      scaleY: { from: 1.1, to: 1.5 },
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    this.landing.add([glow, logs, flame])
  }

  private buildCharacter(): void {
    const spec = SHEETS[this.form]
    this.character = this.add
      .sprite(0, GROUND_Y, this.form)
      .setOrigin(0.5, 1 - spec.footFraction)
      .setScale((spec.display / spec.frameHeight) * CHAR_ZOOM)
    this.character.play(animKey(this.form, 'idle', 'down'))
  }

  private look(facing: Facing): void {
    this.character.play(animKey(this.form, 'idle', facing), true)
  }

  // ------------------------------------------------------------------- beats

  private runBeat(id: BeatId): void {
    switch (id) {
      case 'surround':
        this.beatSurround()
        break
      case 'collapse':
        this.beatCollapse()
        break
      case 'fall':
        this.beatFall()
        break
      case 'impact':
        this.beatImpact()
        break
      case 'settle':
        this.beatSettle()
        break
    }
  }

  /** Torches converge out of the dark while she turns, looking for a way out. */
  private beatSurround(): void {
    this.cameras.main.fadeIn(800, 0, 0, 0)
    this.tweens.add({
      targets: this.world,
      scale: { from: 1, to: PUSH_IN },
      duration: BEATS[0].ms,
      ease: 'Sine.easeIn',
    })

    this.hunters.forEach((rig, i) => {
      this.tweens.add({
        targets: rig.body,
        x: rig.mark.x,
        y: rig.mark.y + GROUND_Y,
        duration: 2500,
        delay: i * 110,
        ease: 'Sine.easeInOut',
      })
    })

    // She turns toward each side in turn — the shot's only piece of acting.
    const glances: Array<[number, Facing]> = [
      [750, 'left'],
      [1500, 'up'],
      [2250, 'right'],
      [3050, 'down'],
    ]
    for (const [at, facing] of glances) this.time.delayedCall(at, () => this.look(facing))
  }

  /** The ground opens. She goes down with it. */
  private beatCollapse(): void {
    this.cameras.main.shake(900, 0.007)
    this.pit.setVisible(true).setScale(0.15).setAlpha(0)
    this.tweens.add({
      targets: this.pit,
      scale: 1,
      alpha: 1,
      duration: 650,
      ease: 'Quad.easeOut',
    })
    // Losing her footing.
    this.tweens.add({
      targets: this.character,
      angle: { from: -7, to: 7 },
      duration: 130,
      yoyo: true,
      repeat: 3,
    })

    this.time.delayedCall(620, () => {
      // The circle breaks: they all step back from the edge.
      for (const rig of this.hunters) {
        this.tweens.add({
          targets: rig.body,
          x: rig.body.x * 1.22,
          y: (rig.body.y - GROUND_Y) * 1.22 + GROUND_Y,
          duration: 420,
          ease: 'Quad.easeOut',
        })
      }
    })

    this.time.delayedCall(760, () => {
      this.tweens.add({
        targets: this.character,
        y: GROUND_Y + 70,
        scale: this.character.scale * 0.55,
        alpha: 0.15,
        angle: 24,
        duration: 480,
        ease: 'Quad.easeIn',
      })
    })
  }

  /** Down the shaft. */
  private beatFall(): void {
    this.surface.setVisible(false)
    this.shaft.setVisible(true)
    this.world.setScale(1)

    // Rotating about her middle rather than her feet, so she tumbles.
    this.character
      .setOrigin(0.5, 0.5)
      .setAlpha(1)
      .setAngle(0)
      .setPosition(0, -160)
      .setScale((SHEETS[this.form].display / SHEETS[this.form].frameHeight) * CHAR_ZOOM * 0.85)
    this.look('down')

    const duration = BEATS[2].ms
    this.tweens.add({ targets: this.character, y: -20, duration, ease: 'Sine.easeOut' })
    this.tweens.add({
      targets: this.character,
      angle: 400,
      duration,
      ease: 'Sine.easeInOut',
    })
    // A slow drift side to side, so she isn't pinned to the centre line.
    this.tweens.add({
      targets: this.character,
      x: { from: -70, to: 60 },
      duration: duration * 0.62,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
    })

    // Walls rushing upward past the camera.
    this.tweens.add({
      targets: this.shaftWall,
      tilePositionY: { from: 0, to: -2600 },
      duration,
      ease: 'Quad.easeIn',
    })

    // The way out, shrinking. It sits high in the frame from the start — a
    // hole centred over her reads as a light shining down, not as distance.
    this.skyHole.setScale(1.25).setAlpha(0.9).setPosition(0, -150)
    this.tweens.add({
      targets: this.skyHole,
      scale: 0.08,
      y: -335,
      alpha: 0.2,
      duration: duration * 0.8,
      ease: 'Quad.easeIn',
    })

    this.streaks.forEach((streak, i) => {
      streak.setAlpha(0)
      this.tweens.add({
        targets: streak,
        alpha: { from: 0, to: 0.3 },
        duration: 500,
        delay: 200 + i * 40,
        yoyo: true,
        hold: duration - 1400,
      })
      this.tweens.add({
        targets: streak,
        y: { from: STAGE_H * 0.7, to: -STAGE_H * 0.7 },
        duration: 340 + (i % 4) * 90,
        delay: i * 55,
        repeat: -1,
      })
    })

    for (let i = 0; i < 14; i++) this.dropRubble(i * 190)
  }

  /** She lands. */
  private beatImpact(): void {
    this.shaft.setVisible(false)
    this.landing.setVisible(true)
    this.tweens.killTweensOf(this.character)
    for (const streak of this.streaks) this.tweens.killTweensOf(streak)

    this.character.setPosition(-40, -220).setAngle(70)
    this.tweens.add({
      targets: this.character,
      y: GROUND_Y - 14,
      angle: 96,
      duration: 210,
      ease: 'Quad.easeIn',
      onComplete: () => this.land(),
    })
  }

  private land(): void {
    this.cameras.main.shake(420, 0.02)
    this.cameras.main.flash(120, 40, 44, 52)

    // Squash on contact, then settle — she stays down.
    this.tweens.add({
      targets: this.character,
      scaleX: this.character.scaleX * 1.18,
      scaleY: this.character.scaleY * 0.82,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    })

    const ring = this.add
      .image(-40, GROUND_Y + 6, 'dust-ring')
      .setScale(0.3)
      .setAlpha(0.85)
    this.fx.add(ring)
    this.tweens.add({
      targets: ring,
      scale: 1.5,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    })

    for (let i = 0; i < 12; i++) {
      const angle = Math.PI + (i / 11) * Math.PI
      const chunk = this.add
        .image(-40, GROUND_Y - 10, 'rubble')
        .setScale(0.5 + Math.random() * 0.7)
        .setAngle(Math.random() * 360)
      this.fx.add(chunk)
      this.tweens.add({
        targets: chunk,
        x: -40 + Math.cos(angle) * (90 + Math.random() * 120),
        y: GROUND_Y + 10 + Math.random() * 26,
        angle: chunk.angle + 180,
        alpha: 0,
        duration: 700 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => chunk.destroy(),
      })
    }
  }

  /** A held breath at the bottom of the hole. */
  private beatSettle(): void {
    this.tweens.add({
      targets: this.world,
      scale: { from: 1.08, to: 1 },
      duration: BEATS[4].ms,
      ease: 'Sine.easeOut',
    })
  }

  /** A chunk of the ceiling coming down with her. */
  private dropRubble(delay: number): void {
    this.time.delayedCall(delay, () => {
      if (this.finished) return
      const chunk = this.add
        .image((Math.random() - 0.5) * STAGE_W * 0.9, -STAGE_H * 0.7, 'rubble')
        .setScale(0.35 + Math.random() * 0.8)
        .setAngle(Math.random() * 360)
        .setAlpha(0.9)
      this.fx.add(chunk)
      this.tweens.add({
        targets: chunk,
        y: STAGE_H * 0.7,
        angle: chunk.angle + 220,
        duration: 700 + Math.random() * 500,
        ease: 'Quad.easeIn',
        onComplete: () => chunk.destroy(),
      })
    })
  }

  // -------------------------------------------------------------------- exit

  private addSkip(): void {
    const hint = this.add
      .text(0, 0, 'Tap to skip', textStyle({ size: 15, color: P.moonDim }))
      .setOrigin(1, 1)
      .setAlpha(0)
      .setScrollFactor(0)
    const place = (): void => {
      hint.setPosition(this.scale.width - 22, this.scale.height - 18)
    }
    place()
    this.scale.on(Phaser.Scale.Events.RESIZE, place)
    this.tweens.add({ targets: hint, alpha: 0.65, duration: 600, delay: 1200 })

    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => this.finish(220))
    this.input.keyboard?.once('keydown', () => this.finish(220))
    this.input.gamepad?.once(Phaser.Input.Gamepad.Events.BUTTON_DOWN, () => this.finish(220))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, place)
    })
  }

  private finish(fadeMs: number): void {
    if (this.finished) return
    this.finished = true
    // Cancelling the timers is what stops a skipped beat from firing over the
    // top of the title screen a few seconds later.
    this.time.removeAllEvents()
    this.tweens.killAll()
    this.cameras.main.fadeOut(fadeMs, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('world', { slot: this.slotIndex })
    })
  }
}
