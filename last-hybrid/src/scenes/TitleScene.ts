/**
 * Title and file select: three save slots, empty until someone fills them.
 *
 * Picking an empty slot goes to character creation; picking a filled one drops
 * straight back into the world where that character left off. The intro only
 * plays for a character who has never been played, which is what makes it an
 * origin story rather than a thing you sit through every session.
 */
import Phaser from 'phaser'
import { P, cssHex } from '../art/palette'
import { SHEETS, animKey } from '../art/sheets'
import { AREAS } from '../world/areas'
import { PLAYER_MAX_HEALTH } from '../game/constants'
import { FORMS } from '../game/forms'
import { SLOT_COUNT, eraseSlot, isFreshSlot, loadSlots, type SaveSlot, type SlotList } from '../game/save'
import { MenuButton, rebuildOnResize, textStyle, uiScale } from '../ui/theme'

export class TitleScene extends Phaser.Scene {
  private slots: SlotList = []
  private objects: Phaser.GameObjects.GameObject[] = []
  private cards: MenuButton[] = []
  private selection = 0
  /** Which slot is asking "really erase this?", or -1. */
  private confirmingErase = -1

  constructor() {
    super('title')
  }

  create(): void {
    this.slots = loadSlots()
    this.confirmingErase = -1
    this.cameras.main.setBackgroundColor(P.void)
    // Arrives out of the intro's fade to black, so it fades up rather than cuts.
    this.cameras.main.fadeIn(600, 0, 0, 0)
    this.build()
    rebuildOnResize(this, () => this.build())

    const keyboard = this.input.keyboard
    keyboard?.on('keydown-UP', () => this.move(-1))
    keyboard?.on('keydown-DOWN', () => this.move(1))
    keyboard?.on('keydown-W', () => this.move(-1))
    keyboard?.on('keydown-S', () => this.move(1))
    keyboard?.on('keydown-ENTER', () => this.choose(this.selection))
    keyboard?.on('keydown-SPACE', () => this.choose(this.selection))
    this.input.gamepad?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        if (button.index === 12) this.move(-1)
        else if (button.index === 13) this.move(1)
        else if (button.index === 0 || button.index === 9) this.choose(this.selection)
      },
    )
  }

  private move(delta: number): void {
    this.confirmingErase = -1
    this.selection = Phaser.Math.Wrap(this.selection + delta, 0, SLOT_COUNT)
    this.cards.forEach((card, i) => card.setHighlighted(i === this.selection))
    this.build()
  }

  private choose(index: number): void {
    const slot = this.slots[index]
    if (!slot) {
      this.scene.start('create', { slot: index })
      return
    }
    // A character who has never been played still owes us their origin story.
    this.start(isFreshSlot(slot) ? 'intro' : 'world', index)
  }

  private start(scene: 'intro' | 'world', index: number): void {
    this.cameras.main.fadeOut(280, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(scene, { slot: index })
    })
  }

  private askErase(index: number): void {
    this.confirmingErase = this.confirmingErase === index ? -1 : index
    this.build()
  }

  private erase(index: number): void {
    this.slots = eraseSlot(index)
    this.confirmingErase = -1
    this.build()
  }

  private build(): void {
    for (const object of this.objects) object.destroy()
    this.objects = []
    this.cards = []

    const { width, height } = this.scale
    const scale = uiScale(this)
    const cx = width / 2
    const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      this.objects.push(object)
      return object
    }

    add(
      this.add
        .image(cx, height * 0.26, 'glow')
        .setTint(P.moonDim)
        .setAlpha(0.2)
        .setScale(3 * scale)
        .setBlendMode(Phaser.BlendModes.ADD),
    )
    const fog = add(
      this.add.tileSprite(0, height - 140 * scale, width, 140 * scale, 'fog').setOrigin(0, 0),
    )
    this.tweens.add({ targets: fog, tilePositionX: 256, duration: 24_000, repeat: -1 })

    add(
      this.add
        .text(cx, height * 0.1, 'THE LAST HYBRID', textStyle({ size: 42 * scale, color: P.ink, bold: true }))
        .setOrigin(0.5),
    )

    const cardW = Math.min(520 * scale, width - 48 * scale)
    const cardH = 84 * scale
    const gap = 14 * scale
    const top = height * 0.24

    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = this.slots[i]
      const y = top + i * (cardH + gap) + cardH / 2
      const card = new MenuButton(this, cx, y, {
        label: '',
        width: cardW,
        height: cardH,
        fill: slot ? P.panel : P.night,
        onClick: () => {
          this.selection = i
          this.confirmingErase = -1
          this.choose(i)
        },
      })
      card.setHighlighted(i === this.selection)
      this.cards.push(card)
      add(card)

      // The card's own label is left blank: a save slot is a small layout of
      // its own, not one centred string.
      this.decorateSlot(add, slot, cx, y, cardW, cardH, scale, i)
    }

    add(
      this.add
        .text(
          cx,
          height - 26 * scale,
          'Touch  ·  Gamepad  ·  WASD to move, Space attack, Shift dash, Q shift form',
          textStyle({ size: 13 * scale, color: P.moonDim }),
        )
        .setOrigin(0.5),
    )

    const placeholders = this.registry.get('placeholderForms') as string[] | undefined
    if (placeholders && placeholders.length > 0) {
      add(
        this.add
          .text(cx, height - 46 * scale, `placeholder art: ${placeholders.join(', ')}`, {
            fontFamily: 'monospace',
            fontSize: `${Math.round(11 * scale)}px`,
            color: cssHex(P.moonDim),
          })
          .setOrigin(0.5)
          .setAlpha(0.7),
      )
    }
  }

  /** Fills in one slot card: portrait, name, where they are — or "empty". */
  private decorateSlot(
    add: <T extends Phaser.GameObjects.GameObject>(object: T) => T,
    slot: SaveSlot | null,
    cx: number,
    cy: number,
    cardW: number,
    cardH: number,
    scale: number,
    index: number,
  ): void {
    const left = cx - cardW / 2
    const textX = left + cardH * 0.9

    if (!slot) {
      add(
        this.add
          .text(cx, cy, '— New game —', textStyle({ size: 20 * scale, color: P.inkSoft }))
          .setOrigin(0.5),
      )
      return
    }

    // The character's own sprite, idling, as the slot's portrait.
    const spec = SHEETS[slot.humanoid]
    const portrait = add(
      this.add
        .sprite(left + cardH * 0.5, cy + cardH * 0.28, slot.humanoid)
        .setOrigin(0.5, 1)
        .setScale((spec.display / spec.frameHeight) * (cardH / 74)),
    ) as Phaser.GameObjects.Sprite
    portrait.play(animKey(slot.humanoid, 'idle', 'down'))

    add(
      this.add
        .text(textX, cy - cardH * 0.2, slot.name, textStyle({ size: 24 * scale, color: P.ink, bold: true, align: 'left' }))
        .setOrigin(0, 0.5),
    )
    const where = isFreshSlot(slot) ? 'Not yet begun' : AREAS[slot.area].name
    add(
      this.add
        .text(
          textX,
          cy + cardH * 0.18,
          `${FORMS[slot.humanoid].name}  ·  ${where}`,
          textStyle({ size: 14 * scale, color: P.inkSoft, align: 'left' }),
        )
        .setOrigin(0, 0.5),
    )

    // Hearts, so a slot shows the state you left it in.
    for (let h = 0; h < PLAYER_MAX_HEALTH; h++) {
      add(
        this.add
          .image(cx + cardW * 0.18 + h * 15 * scale, cy + cardH * 0.18, h < slot.health ? 'heart-full' : 'heart-empty')
          .setOrigin(0, 0.5)
          .setDisplaySize(13 * scale, 13 * scale),
      )
    }

    const erasing = this.confirmingErase === index
    const eraseButton = add(
      this.add
        .text(
          cx + cardW / 2 - 18 * scale,
          cy,
          erasing ? 'Erase?' : '✕',
          textStyle({ size: (erasing ? 15 : 20) * scale, color: erasing ? P.heart : P.inkSoft }),
        )
        .setOrigin(1, 0.5)
        .setPadding(10)
        .setInteractive({ useHandCursor: true }),
    ) as Phaser.GameObjects.Text
    // Two taps to erase: the first turns the cross into the question, the
    // second answers it. Losing a character to one stray tap would be cruel.
    eraseButton.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation()
      if (erasing) this.erase(index)
      else this.askErase(index)
    })
  }
}
