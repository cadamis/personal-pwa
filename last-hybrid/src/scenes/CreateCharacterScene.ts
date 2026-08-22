/**
 * New character: pick a shape, give them a name, save.
 *
 * Reached only from an empty save slot, and it writes that slot before handing
 * off to the intro — so a character exists from the moment you name them, and
 * quitting during the opening leaves them on the file select rather than
 * losing them.
 */
import Phaser from 'phaser'
import { P } from '../art/palette'
import { SHEETS, animKey } from '../art/sheets'
import { FORMS, HUMANOID_IDS, type HumanoidId } from '../game/forms'
import { isValidName, newSlot, writeSlot } from '../game/save'
import { NameEntry } from '../ui/NameEntry'
import { MenuButton, rebuildOnResize, textStyle, uiScale } from '../ui/theme'

/** How large the two form portraits are drawn, relative to their in-game size. */
const PREVIEW_SCALE = 1.25

export class CreateCharacterScene extends Phaser.Scene {
  private slotIndex = 0
  private chosen: HumanoidId = 'fmc'
  private name = ''
  private objects: Phaser.GameObjects.GameObject[] = []
  private formCards: MenuButton[] = []
  private entry: NameEntry | null = null
  // Built after the letter grid, which reports its first value while being
  // constructed — so these are genuinely absent for part of a rebuild.
  private saveButton: MenuButton | null = null
  private nameLabel: Phaser.GameObjects.Text | null = null

  constructor() {
    super('create')
  }

  init(data: { slot?: number }): void {
    this.slotIndex = data.slot ?? 0
  }

  create(): void {
    this.cameras.main.setBackgroundColor(P.void)
    this.cameras.main.fadeIn(400, 0, 0, 0)
    this.build()
    rebuildOnResize(this, () => this.build())

    const keyboard = this.input.keyboard
    // Arrow keys drive the letter grid; the form is picked by tapping or Tab,
    // so typing a name can't accidentally change who you are.
    keyboard?.on('keydown-LEFT', () => this.entry?.move(-1, 0))
    keyboard?.on('keydown-RIGHT', () => this.entry?.move(1, 0))
    keyboard?.on('keydown-UP', () => this.entry?.move(0, -1))
    keyboard?.on('keydown-DOWN', () => this.entry?.move(0, 1))
    keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault()
      this.pickForm((HUMANOID_IDS.indexOf(this.chosen) + 1) % HUMANOID_IDS.length)
    })
    keyboard?.on('keydown-ENTER', () => this.confirm())
    keyboard?.on('keydown-ESC', () => this.back())

    this.input.gamepad?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        switch (button.index) {
          case 14: this.entry?.move(-1, 0); break
          case 15: this.entry?.move(1, 0); break
          case 12: this.entry?.move(0, -1); break
          case 13: this.entry?.move(0, 1); break
          case 0: this.entry?.select(); break
          case 2: this.entry?.backspace(); break
          case 3: this.pickForm((HUMANOID_IDS.indexOf(this.chosen) + 1) % HUMANOID_IDS.length); break
          case 9: this.confirm(); break
          case 1: this.back(); break
        }
      },
    )
  }

  private pickForm(index: number): void {
    this.chosen = HUMANOID_IDS[index]
    this.formCards.forEach((card, i) => card.setHighlighted(i === index))
    this.build()
  }

  private onNameChanged(name: string): void {
    this.name = name
    this.nameLabel?.setText(name || '…')
    this.saveButton?.setEnabled(isValidName(name))
  }

  private confirm(): void {
    if (!isValidName(this.name)) return
    // Timestamps come from the clock here rather than inside the save module,
    // which stays pure so it can be tested without one.
    writeSlot(this.slotIndex, newSlot(this.name, this.chosen, Date.now()))
    this.cameras.main.fadeOut(320, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('intro', { slot: this.slotIndex })
    })
  }

  private back(): void {
    this.scene.start('title')
  }

  private build(): void {
    for (const object of this.objects) object.destroy()
    this.objects = []
    this.formCards = []
    this.entry?.destroy()
    this.entry = null
    this.saveButton = null
    this.nameLabel = null

    const { width, height } = this.scale
    const scale = uiScale(this)
    const cx = width / 2
    const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      this.objects.push(object)
      return object
    }

    add(
      this.add
        .text(cx, height * 0.05, 'WHO WAKES UP?', textStyle({ size: 28 * scale, color: P.ink, bold: true }))
        .setOrigin(0.5),
    )

    // --- form select
    const cardW = Math.min(190 * scale, (width - 70 * scale) / 2)
    const cardH = 74 * scale
    const gap = 18 * scale
    const gridW = Math.min(500 * scale, width - 40 * scale)

    // Measure the whole block first and centre it. On a portrait tablet the UI
    // scale is driven by the narrow axis, so laying out from a fixed fraction
    // of the height leaves everything huddled against the top of the screen.
    //
    // The previews hang *above* formTop, so their height is reserved separately
    // — without it the centring pushes them up into the heading.
    const previewH = PREVIEW_SCALE * 58 * scale
    const gridH = NameEntry.heightFor(gridW, scale)
    const contentH = previewH + cardH * 1.72 + 48 * scale + gridH + 40 * scale + 52 * scale + 62 * scale
    const formTop = Math.max(height * 0.14 + previewH, (height - contentH) / 2 + previewH)

    HUMANOID_IDS.forEach((id, i) => {
      const form = FORMS[id]
      const x = cx + (i - (HUMANOID_IDS.length - 1) / 2) * (cardW + gap)
      const spec = SHEETS[id]
      const preview = add(
        this.add
          .sprite(x, formTop + cardH * 0.1, id)
          .setOrigin(0.5, 1)
          .setScale((spec.display / spec.frameHeight) * PREVIEW_SCALE * scale),
      ) as Phaser.GameObjects.Sprite
      preview.play(animKey(id, 'idle', 'down'))
      if (id !== this.chosen) preview.setAlpha(0.45)

      const card = new MenuButton(this, x, formTop + cardH * 0.65, {
        label: form.name,
        width: cardW,
        height: cardH * 0.8,
        onClick: () => this.pickForm(i),
      })
      card.setHighlighted(id === this.chosen)
      this.formCards.push(card)
      add(card)
    })

    // The two forms differ in speed, reach and damage, and now that they're
    // labelled just "Boy" and "Girl" this line is the only thing that says so.
    add(
      this.add
        .text(
          cx,
          formTop + cardH * 1.22,
          FORMS[this.chosen].blurb,
          textStyle({ size: 14 * scale, color: P.inkSoft, wrap: cardW * 2 + gap }),
        )
        .setOrigin(0.5),
    )

    // --- name
    const nameY = formTop + cardH * 1.72
    add(
      this.add
        .text(cx, nameY, 'NAME', textStyle({ size: 13 * scale, color: P.moonDim }))
        .setOrigin(0.5),
    )
    this.nameLabel = add(
      this.add
        .text(cx, nameY + 26 * scale, '…', textStyle({ size: 30 * scale, color: P.eyeGold, bold: true }))
        .setOrigin(0.5),
    )

    this.entry = new NameEntry(this, {
      x: cx - gridW / 2,
      y: nameY + 48 * scale,
      width: gridW,
      scale,
      initial: this.name,
      onChange: (name) => this.onNameChanged(name),
    })

    const buttonsY = nameY + 48 * scale + this.entry.height + 40 * scale
    this.saveButton = add(
      new MenuButton(this, cx, buttonsY, {
        label: 'Save',
        width: Math.min(240 * scale, width - 80),
        height: 52 * scale,
        fill: P.nightSoft,
        onClick: () => this.confirm(),
      }),
    )
    add(
      new MenuButton(this, cx, buttonsY + 62 * scale, {
        label: 'Back',
        width: Math.min(160 * scale, width - 80),
        height: 40 * scale,
        onClick: () => this.back(),
      }),
    )

    this.onNameChanged(this.name)
  }
}
