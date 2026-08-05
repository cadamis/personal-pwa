import Phaser from 'phaser'
import { P } from '../art/palette'
import { sfx } from '../audio/sfx'
import { loadSave, writeSave } from '../game/save'
import { Button } from '../ui/Button'
import { uiScale } from '../ui/layout'
import { drawPanel, textStyle } from '../ui/theme'

interface PauseData {
  onResume: () => void
  onQuit: () => void
}

/** Shown over a paused run: keep going, mute, or give up. */
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

    const panelW = Math.min(w * 0.8, 400 * s)
    const panelH = Math.min(h * 0.72, 330 * s)
    const panel = this.add.graphics()
    drawPanel(panel, w / 2 - panelW / 2, h / 2 - panelH / 2, panelW, panelH)

    this.add
      .text(w / 2, h / 2 - panelH / 2 + 34 * s, 'Paused', textStyle({ size: 36 * s, color: P.purple, bold: true }))
      .setOrigin(0.5)
    this.add
      .text(w / 2, h / 2 - panelH / 2 + 68 * s, 'Take a breath!', textStyle({ size: 17 * s, color: P.inkSoft }))
      .setOrigin(0.5)

    const btnW = panelW * 0.74
    const btnH = 58 * s
    const baseY = h / 2 - btnH * 0.35

    new Button(this, w / 2, baseY, {
      label: '▶ Keep Playing',
      width: btnW,
      height: btnH,
      fill: P.pink,
      fontSize: 24 * s,
      onClick: () => this.resume(),
    })

    const save = loadSave()
    const muteButton = new Button(this, w / 2, baseY + btnH * 1.15, {
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

    new Button(this, w / 2, baseY + btnH * 2.2, {
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

  private resume(): void {
    if (this.done) return
    this.done = true
    const onResume = this.payload.onResume
    this.scene.stop()
    onResume()
  }
}
