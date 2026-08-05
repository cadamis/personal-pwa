/**
 * End-to-end smoke test for a run.
 *
 * Boots the real game with Phaser's HEADLESS renderer and steps it frame by
 * frame: waves spawn, weapons fire, Grumps die, hearts get hoovered up,
 * level-up cards appear and get picked, bosses turn up, and the run ends on the
 * results screen with sprinkles banked.
 *
 * This is the test that catches "it all renders but nothing actually happens",
 * which unit tests of the data layer can't see.
 */
import Phaser from 'phaser'
import { afterEach, describe, expect, it } from 'vitest'
import { BOSS_TIME } from '../data/enemies'
import { clearSave, loadSave } from '../game/save'
import type { Choice } from '../game/upgradePool'
import { BootScene } from '../scenes/BootScene'
import { MenuScene } from '../scenes/MenuScene'
import { ShopScene } from '../scenes/ShopScene'
import { GameScene } from '../scenes/GameScene'
import { HudScene } from '../scenes/HudScene'
import { LevelUpScene } from '../scenes/LevelUpScene'
import { PauseScene } from '../scenes/PauseScene'
import { ResultScene } from '../scenes/ResultScene'

/** The bits of the scenes a player would reach by tapping. */
interface LevelUpInternals {
  picked: boolean
  payload: { choices: Choice[]; onPick: (choice: Choice) => void }
  scene: Phaser.Scenes.ScenePlugin
}
interface GameInternals {
  spawnBoss(): void
  spawnMiniboss(): void
  endRun(won: boolean, quit?: boolean): void
  hurtPlayer(amount: number): void
  boss: { x: number; y: number } | null
  player: { x: number; y: number }
}
interface HudInternals {
  stick?: { vector: { x: number; y: number } }
}

const STEP_MS = 50 // the largest delta GameScene acts on, so 20 steps per second

async function bootGame(): Promise<Phaser.Game> {
  const game = new Phaser.Game({
    type: Phaser.HEADLESS,
    scale: { mode: Phaser.Scale.NONE, width: 900, height: 620 },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    banner: false,
    audio: { noAudio: true },
    scene: [BootScene, MenuScene, ShopScene, GameScene, HudScene, LevelUpScene, PauseScene, ResultScene],
  })
  await new Promise<void>((resolve) => game.events.once(Phaser.Core.Events.READY, () => resolve()))
  return game
}

describe('a full run', () => {
  let game: Phaser.Game | null = null
  let now = 0
  let picked: Choice[] = []
  /** False simulates a player who never touches the screen. */
  let autopilot = true

  /**
   * Holds the touch stick on a slowly rotating heading, so the character wanders
   * the meadow the way a player would. Standing still is not a realistic test:
   * hearts have to be walked over to be collected.
   */
  function steer(): void {
    if (!autopilot) return
    const hud = game!.scene.getScene('Hud') as unknown as HudInternals
    if (!hud.stick) return
    // A wandering heading rather than a fixed circle: a constant-radius orbit
    // settles into a pursuit equilibrium where the swarm trails forever at the
    // same distance, which is nothing like how the game is actually played.
    const angle = now * 0.0006 + Math.sin(now * 0.00017) * 3.2
    const throttle = 0.55 + 0.4 * Math.sin(now * 0.00031)
    hud.stick.vector.x = Math.cos(angle) * throttle
    hud.stick.vector.y = Math.sin(angle) * throttle
  }

  /** Advances `seconds` of game time, answering any level-up card that appears. */
  function advance(seconds: number): void {
    if (!game) throw new Error('no game')
    const steps = Math.round((seconds * 1000) / STEP_MS)
    for (let i = 0; i < steps; i++) {
      now += STEP_MS
      steer()
      // HEADLESS has no renderer, so the render half of a normal step is skipped.
      game.headlessStep(now, STEP_MS)

      if (game.scene.isActive('LevelUp')) {
        const levelUp = game.scene.getScene('LevelUp') as unknown as LevelUpInternals
        if (!levelUp.picked && levelUp.payload) {
          levelUp.picked = true
          const choice = levelUp.payload.choices[0]
          picked.push(choice)
          levelUp.scene.stop()
          levelUp.payload.onPick(choice)
        }
      }
    }
  }

  const run = (): GameScene => game!.scene.getScene<GameScene>('Game')
  const internals = (): GameInternals => run() as unknown as GameInternals

  async function startRun(characterId = 'mochi', { idle = false } = {}): Promise<void> {
    clearSave()
    picked = []
    autopilot = !idle
    game = await bootGame()
    advance(0.2) // Boot hands over to the menu
    game.scene.stop('Menu')
    game.scene.start('Game', { characterId })
    advance(0.2)
  }

  afterEach(() => {
    game?.destroy(true)
    game = null
    clearSave()
  })

  it('spawns Grumps, squishes them, and levels up', async () => {
    await startRun()

    expect(game!.scene.isActive('Game')).toBe(true)
    expect(game!.scene.isActive('Hud')).toBe(true)
    expect(run().ui.maxHp).toBe(100)
    expect(run().ui.weapons).toHaveLength(1)

    advance(20)

    const ui = run().ui
    // Level-up screens pause the run, so game time lags the steps taken.
    expect(ui.timeSec).toBeGreaterThan(12)
    // Bubble Bark is killing things, hearts are being collected, levels happen.
    expect(ui.kills).toBeGreaterThan(5)
    expect(ui.level).toBeGreaterThan(1)
    expect(picked.length).toBeGreaterThan(0)
    expect(ui.hp).toBeGreaterThan(0)
    expect(ui.hp).toBeLessThanOrEqual(ui.maxHp)
  }, 30_000)

  it('grows the loadout from level-up cards', async () => {
    await startRun('pip')

    advance(60)
    expect(picked.length).toBeGreaterThanOrEqual(2)
    expect(picked.every((c) => c.kind === 'weapon' || c.kind === 'passive')).toBe(true)
    expect(run().ui.weapons.length).toBeGreaterThanOrEqual(1)
    expect(run().ui.level).toBeGreaterThan(2)
  }, 40_000)

  it('does not let you survive by never touching the screen', async () => {
    await startRun('mochi', { idle: true })

    // Hearts have to be walked over and weapons only reach what's near you, so
    // a hands-off player stops growing and the meadow eventually wins.
    for (let i = 0; i < 75 && !game!.scene.isActive('Result'); i++) advance(2)

    expect(game!.scene.isActive('Result')).toBe(true)
    // ...but not so fast that a distracted eight-year-old is punished instantly.
    expect(loadSave().bestTimeSec).toBeGreaterThan(15)
    // An idle run can never reach Sir Fluffington, let alone beat him.
    expect(loadSave().bestTimeSec).toBeLessThan(BOSS_TIME)
    expect(loadSave().wins).toBe(0)
  }, 60_000)

  it('shows a boss with a health bar and wears it down', async () => {
    await startRun()
    advance(5)

    internals().spawnMiniboss()
    advance(0.2)
    expect(run().ui.boss?.name).toBe('Grumpy Gnome')
    expect(run().ui.boss?.frac).toBeCloseTo(1, 1)

    advance(25)
    const boss = run().ui.boss
    expect(boss === null || boss.frac < 1).toBe(true)
  }, 40_000)

  it('reports where an off-screen boss is so the HUD can point at it', async () => {
    await startRun()
    advance(5)
    internals().spawnBoss()
    advance(0.2)

    const boss = internals().boss
    expect(boss).not.toBeNull()

    // Park Sir Fluffington well outside the 900x620 view, up and to the left.
    boss!.x = internals().player.x - 2000
    boss!.y = internals().player.y - 1500
    advance(0.1)

    const shown = run().ui.boss
    expect(shown?.name).toBe('Sir Fluffington')
    expect(shown?.onScreen).toBe(false)
    // Screen-space, so the HUD (which renders unzoomed) can use it directly:
    // up and to the left of the player means up and to the left of centre.
    expect(shown!.screenX).toBeLessThan(0)
    expect(shown!.screenY).toBeLessThan(0)
    expect(shown?.texture).toBe('foe-fluffington')

    // Bring him back on top of the player and the pointer stands down.
    boss!.x = internals().player.x
    boss!.y = internals().player.y
    advance(0.1)
    expect(run().ui.boss?.onScreen).toBe(true)
  }, 30_000)

  it('ends the run, banks sprinkles and opens the results screen', async () => {
    await startRun()
    advance(20)

    const kills = run().ui.kills
    expect(kills).toBeGreaterThan(0)

    internals().endRun(false)
    advance(0.5)

    expect(game!.scene.isActive('Result')).toBe(true)
    expect(game!.scene.isActive('Game')).toBe(false)

    const save = loadSave()
    expect(save.runs).toBe(1)
    expect(save.bestKills).toBe(kills)
    expect(save.bestTimeSec).toBeGreaterThan(10)
    expect(save.sprinkles).toBeGreaterThan(0)
    expect(save.wins).toBe(0)
  }, 30_000)

  it('ends the run when the hearts run out', async () => {
    await startRun()
    advance(3)

    // Damage has a cooldown, so being squished takes several passes.
    for (let i = 0; i < 40 && !game!.scene.isActive('Result'); i++) {
      internals().hurtPlayer(40)
      advance(1)
    }

    expect(game!.scene.isActive('Result')).toBe(true)
    expect(loadSave().runs).toBe(1)
  }, 30_000)

  it('pauses and resumes without losing the run', async () => {
    await startRun()
    advance(5)
    const killsBefore = run().ui.kills

    run().requestPause()
    advance(0.2)
    expect(game!.scene.isActive('Pause')).toBe(true)
    expect(game!.scene.isPaused('Game')).toBe(true)

    // Time does not pass while paused.
    const pausedAt = run().ui.timeSec
    advance(2)
    expect(run().ui.timeSec).toBeCloseTo(pausedAt, 5)

    const pause = game!.scene.getScene('Pause') as unknown as { resume(): void }
    pause.resume()
    advance(3)

    expect(game!.scene.isActive('Game')).toBe(true)
    expect(run().ui.timeSec).toBeGreaterThan(pausedAt)
    expect(run().ui.kills).toBeGreaterThanOrEqual(killsBefore)
  }, 30_000)
})
