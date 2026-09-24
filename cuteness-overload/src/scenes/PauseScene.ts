import Phaser from 'phaser'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { loadSave, writeSave } from '../game/save'
import { Button } from '../ui/Button'
import { uiScale } from '../ui/layout'
import { drawCard, textStyle } from '../ui/theme'

interface PauseData {
  weapons: { icon: string; level: number; max: number; evolved: boolean }[]
  passives: { icon: string; level: number; max: number }[]
  onResume: () => void
  onQuit: () => void
}

/** Shown over a paused run: see your build, keep going, mute, or give up. */
export class PauseScene extends Phaser.Scene {
  private payload!: PauseData
  private done = false

  constructor() {
    super('Pause')
  }

  init(data: PauseData): void {
    this.payload = data
    this.done = false
  }

  create(): void {
    const w = this.scale.width
    const h = this.scale.height
    const s = uiScale(this)

    const dim = this.add.graphics()
    dim.fillStyle(P.night, 0.75)
    dim.fillRect(0, 0, w, h)

    const panelW = Math.min(w * 0.86, 420 * s)
    const panelH = Math.min(h * 0.86, 440 * s)
    const top = h / 2 - panelH / 2
    const panel = this.add.graphics()
    drawCard(panel, w / 2 - panelW / 2, top, panelW, panelH)

    this.add
      .text(w / 2, top + 32 * s, 'Paused', textStyle({ size: 36 * s, color: P.purple, bold: true }))
      .setOrigin(0.5)
    this.add
      .text(w / 2, top + 64 * s, 'Take a breath!', textStyle({ size: 16 * s, color: P.inkSoft }))
      .setOrigin(0.5)

    // Your build so far: weapons on top, helpers underneath.
    const row = (items: { icon: string; level: number; max: number; evolved?: boolean }[], y: number): void => {
      const cell = Math.min(52 * s, (panelW - 30 * s) / 6)
      items.forEach((item, i) => {
        const x = w / 2 + (i - (items.length - 1) / 2) * cell
        this.add.text(x, y, item.icon, textStyle({ size: cell * 0.55 })).setOrigin(0.5)
        const tag = item.evolved ? '★' : item.level >= item.max ? 'MAX' : `${item.level}`
        this.add
          .text(x, y + cell * 0.46, tag, textStyle({ size: cell * 0.24, color: item.evolved ? P.pinkHot : item.level >= item.max ? P.gold : P.teal, bold: true }))
          .setOrigin(0.5)
      })
    }
    row(this.payload.weapons, top + 102 * s)
    if (this.payload.passives.length > 0) row(this.payload.passives, top + 158 * s)

    const btnW = panelW * 0.74
    const btnH = 52 * s
    const baseY = top + panelH - btnH * 2.9

    new Button(this, w / 2, baseY, {
      label: '▶ Keep Playing',
      width: btnW,
      height: btnH,
      fill: P.pink,
      fontSize: 24 * s,
      onClick: () => this.resume(),
    })

    const save = loadSave()
    const muteButton = new Button(this, w / 2, baseY + btnH * 1.1, {
      label: save.muted ? '🔇 Sound: off' : '🔊 Sound: on',
      width: btnW,
      height: btnH * 0.85,
      fill: P.lavender,
      fontSize: 20 * s,
      onClick: () => {
        const current = loadSave()
        const next = { ...current, muted: !current.muted }
        writeSave(next)
        sfx.setMuted(next.muted)
        muteButton.setLabel(next.muted ? '🔇 Sound: off' : '🔊 Sound: on')
      },
    })

    new Button(this, w / 2, baseY + btnH * 2.05, {
      label: 'Give Up',
      width: btnW,
      height: btnH * 0.85,
      fill: P.grumpGrey,
      fontSize: 20 * s,
      onClick: () => {
        if (this.done) return
        this.done = true
        const onQuit = this.payload.onQuit
        this.scene.stop()
        onQuit()
      },
    })

    this.input.keyboard?.on('keydown-ESC', () => this.resume())
  }

  resume(): void {
    if (this.done) return
    this.done = true
    const onResume = this.payload.onResume
    this.scene.stop()
    onResume()
  }
}
