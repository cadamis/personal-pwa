/**
 * End-to-end smoke test for a run.
 *
 * Boots the real game with Phaser's HEADLESS renderer and steps it frame by
 * frame: waves spawn, weapons fire, Grumps die, hearts get hoovered up,
 * level-up cards appear and get picked, chests open, bosses turn up, and the
 * run ends on the results screen with sprinkles and stickers banked.
 *
 * This is the test that catches "it all renders but nothing actually happens",
 * which unit tests of the data layer can't see.
 */
import Phaser from 'phaser'
import { afterEach, describe, expect, it } from 'vitest'
import { ENEMIES } from '../data/enemies'
import { LEVELS, LEVEL_IDS, type LevelId } from '../data/levels'
import { WEAPON_IDS, type WeaponId } from '../data/weapons'
import { clearSave, loadSave, writeSave, defaultSave } from '../game/save'
import type { Choice } from '../game/upgradePool'
import { BootScene } from '../scenes/BootScene'
import { MenuScene } from '../scenes/MenuScene'
import { StageSelectScene } from '../scenes/StageSelectScene'
import { ShopScene } from '../scenes/ShopScene'
import { StickerBookScene } from '../scenes/StickerBookScene'
import { GameScene } from '../scenes/GameScene'
import { HudScene } from '../scenes/HudScene'
import { LevelUpScene } from '../scenes/LevelUpScene'
import { ChestScene } from '../scenes/ChestScene'
import { VictoryScene } from '../scenes/VictoryScene'
import { PauseScene } from '../scenes/PauseScene'
import { ResultScene } from '../scenes/ResultScene'

/** The bits of the scenes a player would reach by tapping. */
interface LevelUpInternals {
  picked: boolean
  payload: { choices: Choice[]; onPick: (choice: Choice) => void }
  scene: Phaser.Scenes.ScenePlugin
}
interface ModalInternals {
  done: boolean
  payload: { onDone?: () => void; onContinue?: () => void; onHome?: () => void }
  scene: Phaser.Scenes.ScenePlugin
}
interface EnemyLike {
  active: boolean
  x: number
  y: number
  hp: number
  maxHp: number
  def: { id: string; behavior: string; isBoss?: boolean }
  carriesChest: boolean
}
interface GameInternals {
  shieldGroup: { getChildren(): { active: boolean; x: number; y: number; blockRadius: number; lifespan: number }[] }
  enemyGroup: { getChildren(): EnemyLike[] }
  pickupGroup: { getChildren(): { active: boolean; kind: string }[] }
  foeShotGroup: { getChildren(): { active: boolean }[] }
  weapons: { update(dt: number): void; sync(inv: unknown): void }
  inventory: { weapons: { id: WeaponId; level: number }[]; passives: { id: string; level: number }[] }
  evolutionsThisRun: WeaponId[]
  presentsPopped: number
  endless: boolean
  bossBeaten: boolean
  invulnUntil: number
  recomputeStats(): void
  afterLoadoutChange(): void
  obstacles?: { all(): Iterable<{ x: number; y: number }>; update(view: Phaser.Geom.Rectangle): void }
  shotGroup: { getChildren(): { active: boolean; x: number; y: number }[] }
  spawnBoss(): void
  spawnChampion(kind: 'elite' | 'miniboss', id: string): void
  openModal(show: () => void): void
  showChest(boss: boolean): void
  damageEnemy(enemy: EnemyLike, amount: number, angle: number): void
  endRun(won: boolean, quit?: boolean): void
  hurtPlayer(amount: number): void
  champions: EnemyLike[]
  player: { x: number; y: number }
}
interface HudInternals {
  stick?: { vector: { x: number; y: number } }
}

const STEP_MS = 50 // the largest delta GameScene acts on, so 20 steps per second
const SCENES = [
  BootScene,
  MenuScene,
  StageSelectScene,
  ShopScene,
  StickerBookScene,
  GameScene,
  HudScene,
  LevelUpScene,
  ChestScene,
  VictoryScene,
  PauseScene,
  ResultScene,
]

async function bootGame(): Promise<Phaser.Game> {
  const game = new Phaser.Game({
    type: Phaser.HEADLESS,
    scale: { mode: Phaser.Scale.NONE, width: 900, height: 620 },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    banner: false,
    audio: { noAudio: true },
    scene: SCENES,
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
  /** When true, chests and the victory screen are answered automatically. */
  let autoModals = true

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

  function answerModals(): void {
    if (game!.scene.isActive('LevelUp')) {
      const levelUp = game!.scene.getScene('LevelUp') as unknown as LevelUpInternals
      if (!levelUp.picked && levelUp.payload) {
        levelUp.picked = true
        const choice = levelUp.payload.choices[0]
        picked.push(choice)
        levelUp.scene.stop()
        levelUp.payload.onPick(choice)
      }
    }
    if (!autoModals) return
    for (const key of ['Chest', 'Victory']) {
      if (!game!.scene.isActive(key)) continue
      const modal = game!.scene.getScene(key) as unknown as ModalInternals
      if (modal.done) continue
      modal.done = true
      modal.scene.stop()
      if (key === 'Chest') modal.payload.onDone?.()
      else modal.payload.onContinue?.()
    }
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
      answerModals()
    }
  }

  const run = (): GameScene => game!.scene.getScene<GameScene>('Game')
  const internals = (): GameInternals => run() as unknown as GameInternals

  async function startRun(
    characterId = 'mochi',
    { idle = false, levelId = 'meadow' as LevelId, grumpier = false } = {},
  ): Promise<void> {
    clearSave()
    // Later levels are locked until the one before is beaten; a test that
    // wants to play one says so by banking those wins first.
    if (levelId !== 'meadow') {
      writeSave({ ...defaultSave(), levelWins: { meadow: 1, forest: 1, peaks: 1, candy: 1, dream: 1 }, wins: 5 })
    }
    picked = []
    autopilot = !idle
    autoModals = true
    game = await bootGame()
    advance(0.2) // Boot hands over to the menu
    game.scene.stop('Menu')
    game.scene.start('Game', { characterId, levelId, grumpier })
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

    advance(25)

    const ui = run().ui
    // Level-up screens pause the run, so game time lags the steps taken.
    expect(ui.timeSec).toBeGreaterThan(15)
    // Bubble Bark is killing things and hearts are being picked up. Asserted as
    // "XP is flowing" rather than "level > 1": how many hearts land inside 25
    // seconds swings a long way run to run, and a threshold there just makes a
    // flaky test. Actual levelling is covered over a 60s window below.
    expect(ui.kills).toBeGreaterThan(5)
    expect(ui.level > 1 || ui.xp > 0).toBe(true)
    expect(ui.hp).toBeGreaterThan(0)
    expect(ui.hp).toBeLessThanOrEqual(ui.maxHp)
    expect(ui.bossTime).toBe(LEVELS.meadow.bossTime)
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
    for (let i = 0; i < 120 && !game!.scene.isActive('Result'); i++) advance(2)

    expect(game!.scene.isActive('Result')).toBe(true)
    // ...but not so fast that a distracted eight-year-old is punished instantly.
    expect(loadSave().bestTimeSec).toBeGreaterThan(15)
    // An idle run can never reach Sir Fluffington, let alone beat him.
    expect(loadSave().bestTimeSec).toBeLessThan(LEVELS.meadow.bossTime)
    expect(loadSave().wins).toBe(0)
  }, 90_000)

  it('shows a mini-boss with a health bar and wears it down', async () => {
    await startRun()
    advance(5)

    internals().spawnChampion('miniboss', 'grumpyGnome')
    advance(0.05)
    expect(run().ui.boss?.name).toBe('Grumpy Gnome')
    expect(run().ui.boss?.frac).toBeGreaterThan(0.8)

    advance(25)
    const boss = run().ui.boss
    expect(boss === null || boss.frac < 1).toBe(true)
  }, 40_000)

  it('names an elite after the Grump it is a big version of', async () => {
    await startRun()
    advance(2)
    internals().spawnChampion('elite', 'grumpySnail')
    advance(0.05)
    expect(run().ui.boss?.name).toBe('Big Grumpy Snail')
    const elite = internals().champions[0]
    expect(elite.carriesChest).toBe(true)
    expect(elite.maxHp).toBeGreaterThan(ENEMIES.grumpySnail.hp * 5)
  }, 30_000)

  it('reports where an off-screen boss is so the HUD can point at it', async () => {
    await startRun()
    advance(5)
    internals().spawnBoss()
    advance(0.2)

    const boss = internals().champions.find((c) => c.def.isBoss)
    expect(boss).toBeDefined()

    // Park Sir Fluffington well outside the 900x620 view, up and to the left
    // (but inside the leash that brings wanderers back).
    boss!.x = internals().player.x - 900
    boss!.y = internals().player.y - 700
    advance(0.05)

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
    advance(0.05)
    expect(run().ui.boss?.onScreen).toBe(true)
  }, 30_000)

  it('opens a treasure chest and evolves a weapon that is ready', async () => {
    await startRun()
    advance(1)
    const inv = internals().inventory
    inv.weapons[0].level = 5 // Bubble Bark, maxed
    inv.passives.push({ id: 'twinBraids', level: 1 })
    internals().afterLoadoutChange()

    autoModals = false
    internals().openModal(() => internals().showChest(false))
    advance(0.1)
    expect(game!.scene.isActive('Chest')).toBe(true)
    expect(game!.scene.isPaused('Game')).toBe(true)

    const chest = game!.scene.getScene('Chest') as unknown as ModalInternals
    chest.done = true
    chest.scene.stop()
    chest.payload.onDone?.()
    advance(0.5)

    expect(internals().inventory.weapons[0].id).toBe('bubbleBath')
    expect(internals().evolutionsThisRun).toEqual(['bubbleBath'])
    expect(game!.scene.isActive('Game')).toBe(true)

    // The evolved weapon fires.
    advance(3)
    expect(internals().shotGroup.getChildren().some((s) => s.active)).toBe(true)

    internals().endRun(false)
    advance(0.2)
    expect(loadSave().evolutionsFound).toEqual(['bubbleBath'])
    expect(loadSave().stickers).toContain('evolve1')
  }, 30_000)

  it('pops presents for prizes', async () => {
    await startRun()
    // Walk about until a present streams in.
    let present: EnemyLike | undefined
    for (let i = 0; i < 30 && !present; i++) {
      advance(1)
      present = internals().enemyGroup.getChildren().find((e) => e.active && e.def.behavior === 'still')
    }
    expect(present).toBeDefined()
    const before = internals().pickupGroup.getChildren().filter((p) => p.active).length
    // Weapons pop presents too, so count from wherever it's got to.
    const popped = internals().presentsPopped
    internals().damageEnemy(present!, 999, 0)
    expect(internals().presentsPopped).toBe(popped + 1)
    expect(internals().pickupGroup.getChildren().filter((p) => p.active).length).toBeGreaterThan(before - 1)
    expect(present!.active).toBe(false)
  }, 40_000)

  it('wins on the boss, offers endless, and banks the win and its sticker', async () => {
    await startRun()
    advance(2)
    internals().invulnUntil = Number.MAX_SAFE_INTEGER
    internals().spawnBoss()
    advance(0.1)
    const boss = internals().champions.find((c) => c.def.isBoss)!
    internals().damageEnemy(boss, boss.hp + 1, 0)
    expect(internals().bossBeaten).toBe(true)

    // A beat later: the boss chest, then the victory screen (answered "keep going").
    advance(2)
    expect(internals().endless).toBe(true)
    expect(game!.scene.isActive('Game')).toBe(true)
    advance(5)

    internals().endRun(true)
    advance(0.2)
    const save = loadSave()
    expect(save.levelWins.meadow).toBe(1)
    expect(save.characterWins).toContain('mochi')
    expect(save.stickers).toEqual(expect.arrayContaining(['meadowChamp', 'winMochi']))
    expect(save.chestsOpened).toBeGreaterThanOrEqual(1)
  }, 40_000)

  it('runs every level with its own Grumps, props and boss', async () => {
    for (const levelId of LEVEL_IDS) {
      await startRun('mochi', { levelId })
      internals().invulnUntil = Number.MAX_SAFE_INTEGER
      advance(8)
      // Grumps have turned up (a strong start can have squished every one on
      // screen at any given moment, so count the fallen too).
      const live = internals().enemyGroup.getChildren().filter((e) => e.active && e.def.behavior !== 'still')
      expect(live.length + run().ui.kills, levelId).toBeGreaterThan(0)
      internals().spawnBoss()
      // Long enough for every boss move to come round at least once.
      advance(12)
      expect(game!.scene.isActive('Game') || game!.scene.isPaused('Game'), levelId).toBe(true)
      expect(run().ui.boss?.name, levelId).toBe(ENEMIES[LEVELS[levelId].boss].name)
      game!.destroy(true)
      game = null
    }
  }, 120_000)

  it('fires every weapon, base and evolved, without falling over', async () => {
    await startRun('mochi', { levelId: 'forest' })
    internals().invulnUntil = Number.MAX_SAFE_INTEGER
    advance(3)
    for (let i = 0; i < WEAPON_IDS.length; i += 6) {
      const batch = WEAPON_IDS.slice(i, i + 6)
      internals().inventory.weapons = batch.map((id) => ({ id, level: 1 }))
      internals().afterLoadoutChange()
      advance(4)
      // Still going (a level-up card may have it paused this very frame).
      expect(game!.scene.isActive('Game') || game!.scene.isPaused('Game'), batch.join()).toBe(true)
    }
  }, 60_000)

  it('runs the forest with its own boss and a field of bushes', async () => {
    await startRun('mochi', { levelId: 'forest' })
    advance(6)

    // Bushes are streamed in around the camera rather than laid out up front.
    const bushes = [...(internals().obstacles?.all() ?? [])]
    expect(bushes.length).toBeGreaterThan(3)

    // Every one of them is solid: no shot should still be alive inside a bush.
    advance(10)
    const radius = LEVELS.forest.obstacles!.radius
    for (const shot of internals().shotGroup.getChildren()) {
      if (!shot.active) continue
      for (const bush of internals().obstacles!.all()) {
        expect(Math.hypot(shot.x - bush.x, shot.y - bush.y)).toBeGreaterThan(radius * 0.6)
      }
    }

    internals().spawnBoss()
    advance(0.2)
    expect(run().ui.boss?.name).toBe('Grumpy Monkey')
  }, 40_000)

  it('walking the same ground twice finds the same bushes', async () => {
    await startRun('mochi', { levelId: 'forest' })
    advance(2)
    const field = internals().obstacles!
    const view = new Phaser.Geom.Rectangle(0, 0, 900, 620)
    field.update(view)
    const before = [...field.all()].map((b) => `${Math.round(b.x)},${Math.round(b.y)}`).sort()

    // Scroll a long way off and back again.
    field.update(new Phaser.Geom.Rectangle(40000, 40000, 900, 620))
    field.update(view)
    const after = [...field.all()].map((b) => `${Math.round(b.x)},${Math.round(b.y)}`).sort()

    expect(after).toEqual(before)
    expect(before.length).toBeGreaterThan(0)
  }, 30_000)

  it('applies the level payout multiplier to what gets banked', async () => {
    // Ended on a win deliberately: the 200-sprinkle victory bonus is what makes
    // this decisive. Comparing two losing runs means comparing a handful of
    // chance-based drops, which is a coin flip rather than a test.
    const bank = async (levelId: LevelId): Promise<number> => {
      await startRun('mochi', { levelId })
      advance(20)
      internals().endRun(true)
      advance(0.3)
      // Stickers pay out too; take them back out so only the run is compared.
      const save = loadSave()
      const total = save.sprinkles
      game!.destroy(true)
      game = null
      return total - stickerSprinkles(save.stickers)
    }

    const meadow = await bank('meadow')
    const forest = await bank('forest')

    expect(meadow).toBeGreaterThan(0)
    // Half the multiplier, so roughly half the banked total; a wide margin keeps
    // the pickup noise out of it.
    expect(forest).toBeGreaterThan(meadow * 1.5)
  }, 60_000)

  it('pays more on Grumpier mode', async () => {
    const bank = async (grumpier: boolean): Promise<number> => {
      await startRun('mochi', { levelId: 'forest', grumpier })
      // Grumpier is meant for upgraded friends; a fresh save can be squished
      // in seconds, which would make this a test of survival, not payout.
      internals().invulnUntil = Number.MAX_SAFE_INTEGER
      advance(10)
      internals().endRun(true)
      advance(0.3)
      const save = loadSave()
      game!.destroy(true)
      game = null
      return save.sprinkles - stickerSprinkles(save.stickers)
    }
    const normal = await bank(false)
    const grumpy = await bank(true)
    // The win bonus alone is worth 1.6x; kills and pickups add noise either way.
    expect(grumpy).toBeGreaterThan(normal * 1.3)
  }, 60_000)

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
    expect(save.totalKills).toBe(kills)
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

  it('does not let Nap Time run out while the game is paused', async () => {
    await startRun()
    advance(1)
    ;(internals() as unknown as { startNap(): void }).startNap()
    advance(0.1)
    const napBefore = run().ui.napLeft
    expect(napBefore).toBeGreaterThan(5000)

    // Longer than the whole nap, spent staring at the pause screen.
    run().requestPause()
    advance(8)
    const pause = game!.scene.getScene('Pause') as unknown as { resume(): void }
    pause.resume()
    advance(0.1)
    expect(run().ui.napLeft).toBeGreaterThan(napBefore - 500)
  }, 30_000)

  it('opens every menu screen without falling over', async () => {
    clearSave()
    writeSave({ ...defaultSave(), sprinkles: 5000, levelWins: { meadow: 2 }, stickers: ['meadowChamp'], newStickers: ['meadowChamp'] })
    game = await bootGame()
    advance(0.2)
    for (const key of ['Menu', 'StageSelect', 'Shop', 'StickerBook']) {
      game.scene.getScenes(true).forEach((s) => game!.scene.stop(s.scene.key))
      game.scene.start(key, { characterId: 'mochi' })
      advance(0.2)
      expect(game.scene.isActive(key), key).toBe(true)
    }
    // Opening the book marks its stickers as seen.
    expect(loadSave().newStickers).toEqual([])
  }, 30_000)
})

/** Sprinkles paid out by stickers alone, so payout tests can compare runs fairly. */
function stickerSprinkles(stickers: readonly string[]): number {
  let total = 0
  for (const id of stickers) {
    const reward = STICKER_REWARDS[id]
    if (reward) total += reward
  }
  return total
}

import { STICKERS, STICKER_IDS } from '../data/stickers'
const STICKER_REWARDS: Record<string, number> = Object.fromEntries(
  STICKER_IDS.map((id) => {
    const reward = STICKERS[id].reward
    return [id, reward.kind === 'sprinkles' ? reward.amount : 0]
  }),
)
