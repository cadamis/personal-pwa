/**
 * The heads-up display — hearts, current form, the area-name card — and the
 * on-screen controls.
 *
 * The controls live here rather than in the world scene for one concrete
 * reason: this scene's camera isn't zoomed. A `scrollFactor(0)` object on the
 * world's zoomed camera is still scaled by that zoom, which walks the buttons
 * straight off the corner of the screen at anything above 1x.
 *
 * Keeping them here also means every interactive object in the game sits in one
 * scene, so nothing up here can swallow a tap meant for the movement stick.
 */
import Phaser from 'phaser'
import { PLAYER_MAX_HEALTH } from '../game/constants'
import { P } from '../art/palette'
import { TouchControls } from '../input/TouchControls'
import type { InputManager } from '../input/InputManager'
import { rebuildOnResize, textStyle, uiScale } from '../ui/theme'
import type { WorldScene } from './WorldScene'

/** How far past the viewport the danger vignette is stretched. */
const VIGNETTE_OVERSCAN = 1.5

export class HudScene extends Phaser.Scene {
  private world!: WorldScene
  private gameInput!: InputManager
  private controls: TouchControls | null = null
  /** The readout's own objects — the controls are not in here, and survive a rebuild. */
  private objects: Phaser.GameObjects.GameObject[] = []
  private hearts: Phaser.GameObjects.Image[] = []
  private formLabel!: Phaser.GameObjects.Text
  private areaCard!: Phaser.GameObjects.Text
  private vignette!: Phaser.GameObjects.Image
  private shownHealth = -1
  private shownForm = ''

  constructor() {
    super({ key: 'hud', active: false })
  }

  init(data: { input: InputManager }): void {
    this.gameInput = data.input
  }

  create(): void {
    this.world = this.scene.get('world') as WorldScene
    this.build()
    this.controls = new TouchControls(this, this.gameInput, this.hudHeight())
    rebuildOnResize(this, () => this.build())

    this.world.events.on('area-entered', this.showAreaCard, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.world.events.off('area-entered', this.showAreaCard, this)
    })
  }

  override update(): void {
    const state = this.world.hud
    this.controls?.setInteractAvailable(state.interactAvailable)

    if (state.health !== this.shownHealth) {
      this.shownHealth = state.health
      this.hearts.forEach((heart, i) => {
        heart.setTexture(i < state.health ? 'heart-full' : 'heart-empty')
      })
      // A pulse on the heart just lost, so a hit is felt as well as seen.
      const lost = this.hearts[state.health]
      if (lost) {
        this.tweens.add({ targets: lost, scale: { from: lost.scale * 1.5, to: lost.scale }, duration: 180 })
      }
    }

    if (state.formId !== this.shownForm) {
      this.shownForm = state.formId
      this.formLabel.setText(state.formName)
    }

    // Danger tint at the edges: something has noticed you.
    const wanted = state.hunted ? 0.55 : 0
    this.vignette.setAlpha(Phaser.Math.Linear(this.vignette.alpha, wanted, 0.06))
  }

  /** Called by the world scene when a modal covers the game. */
  setControlsSuspended(suspended: boolean): void {
    this.controls?.setSuspended(suspended)
  }

  /** Height of the readout strip, which the movement stick must not sit under. */
  private hudHeight(): number {
    return 72 * uiScale(this)
  }

  private showAreaCard(name: string): void {
    this.areaCard.setText(name).setAlpha(0)
    this.tweens.killTweensOf(this.areaCard)
    this.tweens.add({
      targets: this.areaCard,
      alpha: 1,
      duration: 320,
      hold: 1400,
      yoyo: true,
    })
  }

  private build(): void {
    for (const object of this.objects) object.destroy()
    this.objects = []
    this.hearts = []
    this.shownHealth = -1
    this.shownForm = ''

    const { width, height } = this.scale
    const scale = uiScale(this)
    const size = 30 * scale
    const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      this.objects.push(object)
      return object
    }

    for (let i = 0; i < PLAYER_MAX_HEALTH; i++) {
      this.hearts.push(
        add(
          this.add
            .image(20 * scale + i * (size * 0.92), 22 * scale, 'heart-empty')
            .setOrigin(0, 0)
            .setDisplaySize(size, size),
        ),
      )
    }

    this.formLabel = add(
      this.add
        .text(
          20 * scale,
          22 * scale + size + 6 * scale,
          '',
          textStyle({ size: 15 * scale, color: P.moon, align: 'left', stroke: P.void, strokeWidth: 3 }),
        )
        .setOrigin(0, 0),
    )

    this.areaCard = add(
      this.add
        .text(
          width / 2,
          90 * scale,
          '',
          textStyle({ size: 30 * scale, color: P.ink, stroke: P.void, strokeWidth: 5 }),
        )
        .setOrigin(0.5)
        .setAlpha(0),
    )

    this.vignette = add(
      this.add
        .image(width / 2, height / 2, 'vignette')
        .setTint(P.bloodRed)
        .setAlpha(0)
        // Oversized: the texture's gradient is a circle, so at exactly viewport
        // size the screen's corners fall outside it and take the solid end of
        // the ramp, turning a rim into a red frame.
        .setDisplaySize(width * VIGNETTE_OVERSCAN, height * VIGNETTE_OVERSCAN),
    )

    this.controls?.setHudHeight(this.hudHeight())
  }
}
