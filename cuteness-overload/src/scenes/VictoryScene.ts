import Phaser from 'phaser'
import { artScale } from '../art/textures'
import { P } from '../art/palette'
import { Button } from '../ui/Button'
import { uiScale } from '../ui/layout'
import { drawCard, textStyle } from '../ui/theme'

interface VictoryData {
  bossName: string
  bossTexture: string
  levelName: string
  onContinue: () => void
  onHome: () => void
}

/**
 * Shown when a level's boss falls. The level is won either way; the choice is
 * whether to bank it now or keep going in endless mode for bigger rewards and
 * the survival stickers.
 */
export class VictoryScene extends Phaser.Scene {
  private payload!: VictoryData
  private done = false

  constructor() {
    super('Victory')
  }

  init(data: VictoryData): void {
    this.payload = data
    this.done = false
  }

  create(): void {
    const w = this.scale.width
    const h = this.scale.height
    const s = uiScale(this)
    const dim = this.add.graphics()
    dim.fillStyle(P.night, 0.78)
    dim.fillRect(0, 0, w, h)

    const panelW = Math.min(w * 0.88, 460 * s)
    const panelH = Math.min(h * 0.86, 440 * s)
    const top = h / 2 - panelH / 2
    const panel = this.add.graphics()
    drawCard(panel, w / 2 - panelW / 2, top, panelW, panelH, { edge: P.gold, glow: true })

    const title = this.add
      .text(w / 2, top + 36 * s, 'YOU WON!', textStyle({ size: 44 * s, color: P.gold, stroke: P.ink, strokeWidth: 7 * s, bold: true }))
      .setOrigin(0.5)
    this.tweens.add({ targets: title, scale: 1.07, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.add
      .text(w / 2, top + 78 * s, `${this.payload.bossName} has been out-cuted!`, textStyle({ size: 18 * s, color: P.inkSoft, wrap: panelW * 0.86 }))
      .setOrigin(0.5)

    // The defeated boss, dizzy and upside-down-ish.
    const boss = this.add
      .image(w / 2, top + panelH * 0.42, this.payload.bossTexture, 0)
      .setScale(artScale(this.payload.bossTexture) * 1.6 * s)
      .setAngle(-12)
    this.tweens.add({ targets: boss, angle: 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    this.add
      .text(w / 2, top + panelH * 0.64, 'Keep going for bonus sprinkles, more treasure and survival stickers — or head home with your win!', textStyle({ size: 15 * s, color: P.ink, wrap: panelW * 0.84 }))
      .setOrigin(0.5)

    const btnW = panelW * 0.8
    const btnH = 54 * s
    new Button(this, w / 2, top + panelH - btnH * 1.85, {
      label: '♾️ Keep going!',
      width: btnW,
      height: btnH,
      fill: P.pink,
      fontSize: 24 * s,
      onClick: () => this.finish(this.payload.onContinue),
    })
    new Button(this, w / 2, top + panelH - btnH * 0.75, {
      label: '🏠 Head home',
      width: btnW,
      height: btnH * 0.85,
      fill: P.lavender,
      fontSize: 20 * s,
      onClick: () => this.finish(this.payload.onHome),
    })
  }

  private finish(fn: () => void): void {
    if (this.done) return
    this.done = true
    this.scene.stop()
    fn()
  }
}
