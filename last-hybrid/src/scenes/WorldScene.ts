/**
 * The game itself: one long-lived scene that swaps areas underneath a
 * persistent player, camera and control rig.
 *
 * Areas are torn down and rebuilt rather than living in a scene each, because
 * restarting a scene per doorway would mean re-creating the input manager and
 * the touch controls every time — and losing a held stick in the process.
 */
import Phaser from 'phaser'
import { AREA_FADE_MS, DEPTH, RESPAWN_FADE_MS, TILE, VIEW_TILES, ZOOM_MAX, ZOOM_MIN } from '../game/constants'
import { P } from '../art/palette'
import { strikeHits } from '../game/combat'
import { FORMS, type HumanoidId } from '../game/forms'
import { readSlot, writeSlot, type SaveSlot } from '../game/save'
import { InputManager } from '../input/InputManager'
import { Player } from '../entities/Player'
import { Enemy } from '../entities/Enemy'
import { buildArea, type BuiltArea } from '../world/buildArea'
import { AREAS, exitAt, spawnPoint, tileCenter, type AreaId } from '../world/areas'
import { textStyle } from '../ui/theme'
import { wakeLock } from '../lib/wakeLock'
import type { HudScene } from './HudScene'

/** What the HUD reads each frame. */
export interface HudState {
  health: number
  formName: string
  formId: string
  areaName: string
  hunted: boolean
  /** Whether there's something in reach to use, which shows the "use" button. */
  interactAvailable: boolean
}

/** How close the player has to be to use something. */
const INTERACT_RADIUS = 74

export class WorldScene extends Phaser.Scene {
  readonly hud: HudState = {
    health: 0,
    formName: '',
    formId: '',
    areaName: '',
    hunted: false,
    interactAvailable: false,
  }

  // Not `input` — Phaser.Scene already owns that name for its input plugin.
  private gameInput!: InputManager
  private player!: Player
  private enemies!: Phaser.Physics.Arcade.Group
  private area: BuiltArea | null = null
  private areaColliders: Phaser.Physics.Arcade.Collider[] = []
  private humanoid: HumanoidId = 'fmc'
  private slotIndex = 0
  private slot: SaveSlot | null = null
  private transitioning = false
  private respawning = false
  private interactTarget: { x: number; y: number } | null = null
  private prompt!: Phaser.GameObjects.Text

  constructor() {
    super('world')
  }

  init(data: { slot?: number }): void {
    this.slotIndex = data.slot ?? 0
    this.slot = readSlot(this.slotIndex)
    if (this.slot) this.humanoid = this.slot.humanoid
  }

  create(): void {
    this.cameras.main.setBackgroundColor(P.void)
    this.transitioning = false
    this.respawning = false

    this.gameInput = new InputManager(this)
    this.player = new Player(this, 0, 0, this.humanoid)
    this.enemies = this.physics.add.group()

    // These outlive any single area, so they're registered once.
    this.physics.add.collider(this.enemies, this.enemies)
    this.physics.add.overlap(this.player, this.enemies, this.onTouchedEnemy, undefined, this)

    this.prompt = this.add
      .text(0, 0, '', textStyle({ size: 14, color: P.fireHot, stroke: P.void, strokeWidth: 4 }))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.overlay)
      .setVisible(false)

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.applyZoom()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this)

    const resume = this.slot
    if (resume && resume.x !== null && resume.y !== null) {
      this.enterArea(resume.area, undefined, { x: resume.x, y: resume.y })
      this.player.health = resume.health
    } else {
      this.enterArea('clearing', 'start')
    }
    // The HUD owns the on-screen controls: its camera isn't zoomed, and a
    // scroll-factor-0 object on a zoomed camera still gets magnified straight
    // off the edge of the screen.
    this.scene.launch('hud', { input: this.gameInput })
    this.cameras.main.fadeIn(320, 0, 0, 0)

    wakeLock.acquire()
    document.addEventListener('visibilitychange', this.onHidden)
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this)
  }

  override update(time: number): void {
    this.gameInput.update()

    if (!this.player.isDead && !this.transitioning) {
      this.handleActions()
    }

    this.player.drag = this.area?.dragAt(this.player.x, this.player.y) ?? 1
    this.player.drive(this.gameInput.move)
    this.resolveStrike()

    let hunted = false
    for (const enemy of this.livingEnemies()) {
      enemy.think(this.player.x, this.player.y, !this.player.isDead, time)
      if (enemy.isHunting) hunted = true
    }

    this.updateInteractTarget()
    this.checkExit()
    if (this.player.isDead && !this.respawning) this.beginRespawn()

    this.hud.health = this.player.health
    // Their own name while human; the wolf isn't a person you named.
    this.hud.formName =
      this.player.formId === 'wolf' || !this.slot
        ? FORMS[this.player.formId].name
        : this.slot.name
    this.hud.formId = this.player.formId
    this.hud.areaName = this.area?.def.name ?? ''
    this.hud.hunted = hunted

    this.gameInput.endFrame()
  }

  private handleActions(): void {
    if (this.gameInput.justPressed('pause')) {
      this.pauseGame()
      return
    }
    if (this.gameInput.justPressed('shift')) this.player.shiftForm()
    if (this.gameInput.justPressed('dash')) this.player.dash(this.gameInput.move)
    if (this.gameInput.justPressed('attack')) this.player.attack()
    if (this.gameInput.justPressed('interact')) this.useInteractTarget()
  }

  // ------------------------------------------------------------------ combat

  /**
   * The group's live members, typed.
   *
   * `getChildren()` is only as specific as `GameObject`, so the narrowing has
   * to happen somewhere — doing it in one place means only one line to check
   * if the group ever holds anything else.
   */
  private livingEnemies(): Enemy[] {
    return (this.enemies.getChildren() as unknown as Enemy[]).filter((enemy) => enemy.isAlive)
  }

  /** Applies the live swing, if any, to everything standing in it. */
  private resolveStrike(): void {
    const strike = this.player.currentStrike()
    if (!strike) return
    for (const enemy of this.livingEnemies()) {
      if (!strikeHits(strike, enemy.x, enemy.y, enemy.stats.bodyRadius)) continue
      if (enemy.takeDamage(strike.damage, strike.x, strike.y, strike.id)) continue
      this.cameras.main.shake(70, 0.002)
    }
  }

  private onTouchedEnemy(
    _player:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    enemyObject:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
  ): void {
    const enemy = enemyObject as Enemy
    if (!enemy.isAlive || this.player.isDead) return
    if (this.player.takeDamage(enemy.stats.damage, enemy.x, enemy.y)) {
      this.cameras.main.shake(160, 0.006)
      this.cameras.main.flash(90, 90, 20, 30)
    }
  }

  // ------------------------------------------------------------------- areas

  private enterArea(id: AreaId, spawnName: string | undefined, at?: { x: number; y: number }): void {
    for (const collider of this.areaColliders) collider.destroy()
    this.areaColliders = []
    this.enemies.clear(true, true)
    this.area?.destroy()

    const def = AREAS[id]
    const area = buildArea(this, def)
    this.area = area

    this.physics.world.setBounds(0, 0, area.widthPx, area.heightPx)
    this.cameras.main.setBounds(0, 0, area.widthPx, area.heightPx)

    const spawn = spawnPoint(def, spawnName)
    const where = at ?? tileCenter(spawn.tx, spawn.ty, TILE)
    this.player.setPosition(where.x, where.y)
    this.player.setVelocity(0, 0)
    this.player.facing = spawn.facing
    this.cameras.main.centerOn(where.x, where.y)

    for (const spawnPointDef of def.enemies) {
      const position = tileCenter(spawnPointDef.tx, spawnPointDef.ty, TILE)
      const enemy = new Enemy(this, position.x, position.y, spawnPointDef.type)
      this.enemies.add(enemy)
    }

    this.areaColliders.push(
      this.physics.add.collider(this.player, area.solids),
      this.physics.add.collider(this.enemies, area.solids),
    )

    // Areas differ in size, and the zoom floor depends on it.
    this.applyZoom()
    this.events.emit('area-entered', def.name)
  }

  /** Walks the player through a doorway, with a fade over the swap. */
  private checkExit(): void {
    if (this.transitioning || this.respawning || !this.area || this.player.isDead) return
    const tx = Math.floor(this.player.x / TILE)
    const ty = Math.floor(this.player.y / TILE)
    const exit = exitAt(this.area.def, tx, ty)
    if (!exit) return

    this.transitioning = true
    this.gameInput.setEnabled(false)
    this.player.setVelocity(0, 0)
    this.cameras.main.fadeOut(AREA_FADE_MS, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.enterArea(exit.to, exit.spawn)
      this.cameras.main.fadeIn(AREA_FADE_MS, 0, 0, 0)
      this.transitioning = false
      this.gameInput.setEnabled(true)
    })
  }

  private beginRespawn(): void {
    this.respawning = true
    this.gameInput.setEnabled(false)
    this.time.delayedCall(RESPAWN_FADE_MS, () => {
      this.cameras.main.fadeOut(RESPAWN_FADE_MS, 0, 0, 0)
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        // Death always sends you back to the fire, which is what makes the
        // Hollow a base rather than just the first room.
        this.enterArea('clearing', 'start')
        const fire = this.area?.campfire
        this.player.revive(fire ? fire.x : this.player.x, fire ? fire.y + 34 : this.player.y)
        this.cameras.main.centerOn(this.player.x, this.player.y)
        this.cameras.main.fadeIn(RESPAWN_FADE_MS, 0, 0, 0)
        this.respawning = false
        this.gameInput.setEnabled(true)
      })
    })
  }

  // -------------------------------------------------------------- interaction

  private updateInteractTarget(): void {
    const fire = this.area?.campfire ?? null
    const near =
      fire !== null &&
      !this.player.isDead &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, fire.x, fire.y) < INTERACT_RADIUS

    this.interactTarget = near ? fire : null
    this.hud.interactAvailable = near

    if (near && fire) {
      const full = this.player.health >= 6
      this.prompt
        .setText(full ? 'Rest' : 'Rest — restore your wounds')
        .setPosition(fire.x, fire.y - 34)
        .setVisible(true)
    } else {
      this.prompt.setVisible(false)
    }
  }

  private useInteractTarget(): void {
    const target = this.interactTarget
    if (!target) return
    this.player.heal(99)
    const flare = this.add
      .image(target.x, target.y, 'glow')
      .setTint(P.fireHot)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.decal)
      .setScale(1)
    this.tweens.add({
      targets: flare,
      scale: 4,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => flare.destroy(),
    })
    this.events.emit('area-entered', 'Rested')
  }

  // -------------------------------------------------------------------- misc

  private pauseGame(): void {
    // The HUD isn't paused with the world (it keeps rendering under the
    // overlay), and it's what owns the touch controls — so they have to be
    // muted and hidden explicitly, or the stick keeps working behind the pause
    // screen and the buttons sit on top of it.
    this.setHudControls(false)
    this.scene.pause()
    this.scene.launch('pause')
  }

  /** Called by the pause scene on the way out. */
  resumeGame(): void {
    this.setHudControls(true)
    this.gameInput.setEnabled(true)
    this.scene.resume()
  }

  private setHudControls(live: boolean): void {
    const hud = this.scene.get('hud') as HudScene
    hud.input.enabled = live
    hud.setControlsSuspended(!live)
  }

  /**
   * Picks a zoom that shows roughly {@link VIEW_TILES} across, but never one so
   * far out that the area stops filling the screen — an area shorter than a
   * portrait viewport would otherwise be letterboxed against the void.
   */
  private applyZoom(): void {
    const { width, height } = this.scale
    const preferred = Phaser.Math.Clamp(width / (VIEW_TILES * TILE), ZOOM_MIN, ZOOM_MAX)
    const fill = this.area ? Math.max(width / this.area.widthPx, height / this.area.heightPx) : 0
    this.cameras.main.setZoom(Math.max(preferred, fill))
  }

  /**
   * Writes where the player is back to their slot.
   *
   * Called on the way out of the scene *and* whenever the tab is hidden: on a
   * tablet the usual way to stop playing is to switch apps, which never runs a
   * shutdown, so waiting for one would quietly lose the session.
   */
  private autoSave(): void {
    if (!this.slot || !this.player || this.player.isDead) return
    this.slot = {
      ...this.slot,
      area: this.area?.def.id ?? this.slot.area,
      x: this.player.x,
      y: this.player.y,
      health: this.player.health,
      updatedAt: Date.now(),
    }
    writeSlot(this.slotIndex, this.slot)
  }

  private readonly onHidden = (): void => {
    if (document.visibilityState === 'hidden') this.autoSave()
  }

  private onShutdown(): void {
    this.autoSave()
    document.removeEventListener('visibilitychange', this.onHidden)
    this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this)
    for (const collider of this.areaColliders) collider.destroy()
    this.areaColliders = []
    this.area?.destroy()
    this.area = null
    this.scene.stop('hud')
    wakeLock.release()
  }
}
