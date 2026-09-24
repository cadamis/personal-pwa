/**
 * Balance harness: plays whole runs headlessly with a bot and prints how they
 * went. Skipped unless SIM=1, because it takes a minute and asserts nothing —
 * it's a measuring tape, not a test.
 *
 *   SIM=1 npx vitest run src/__tests__/tuning.sim.test.ts
 *   SIM=1 SIM_LEVELS=meadow,forest SIM_PROFILES=kid SIM_RUNS=6 npx vitest run src/__tests__/tuning.sim.test.ts
 *
 * The bot is "a kid who's played a bit": it steers away from nearby Grumps
 * (hardest from the closest), drifts towards hearts, presents and chests, and
 * wanders when there's nothing to do. It picks level-up cards the way a child
 * would — at random from what's offered, preferring things it already has —
 * and never uses rerolls. It is deliberately not clever.
 */
import Phaser from 'phaser'
import { describe, it } from 'vitest'
import { LEVELS, LEVEL_IDS, type LevelId } from '../data/levels'
import { META_IDS, METAS } from '../data/meta'
import { clearSave, defaultSave, loadSave, writeSave, type SaveData } from '../game/save'
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

/** Node's env, without pulling in Node's types for one lookup. */
const env: Record<string, string | undefined> =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const ENABLED = env.SIM === '1'
const STEP = 50

type Profile = 'fresh' | 'kid' | 'maxed'

function profileSave(profile: Profile): SaveData {
  const base = { ...defaultSave(), levelWins: { meadow: 1, forest: 1, peaks: 1, candy: 1, dream: 1 } }
  if (profile === 'fresh') return base
  const upgrades: SaveData['upgrades'] = {}
  if (profile === 'kid') {
    // The original eleven shop items, bought out — where the kids are now.
    for (const id of META_IDS.slice(0, 11)) upgrades[id] = Math.min(METAS[id].maxLevel, id === 'growthSpurt' || id === 'sharperSparkles' ? 6 : METAS[id].maxLevel)
    upgrades.windUpWatch = 5
    upgrades.piggyBank = 5
    upgrades.bookBag = 4
  } else {
    for (const id of META_IDS) upgrades[id] = METAS[id].maxLevel
  }
  return { ...base, upgrades, stickers: ['evolve1', 'doubleEvolve', 'squish500', 'level60', 'present25'] }
}

interface EnemyLike {
  active: boolean
  x: number
  y: number
  worldRadius: number
  def: { behavior: string; isBoss?: boolean }
}
interface ShotLike {
  active: boolean
  x: number
  y: number
  body: { velocity: { x: number; y: number } }
}
interface PickupLike {
  active: boolean
  x: number
  y: number
  kind: string
}
interface GameLike {
  champions: { uid: number; active: boolean; displayName: string }[]
  enemyGroup: { getChildren(): EnemyLike[] }
  foeShotGroup: { getChildren(): ShotLike[] }
  pickupGroup: { getChildren(): PickupLike[] }
  player: { x: number; y: number }
  hp: number
  bossBeaten: boolean
  evolutionsThisRun: string[]
  chestsOpened: number
  ui: { timeSec: number; level: number; kills: number; maxHp: number }
}

async function boot(): Promise<Phaser.Game> {
  const game = new Phaser.Game({
    type: Phaser.HEADLESS,
    scale: { mode: Phaser.Scale.NONE, width: 900, height: 620 },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    banner: false,
    audio: { noAudio: true },
    scene: [BootScene, MenuScene, StageSelectScene, ShopScene, StickerBookScene, GameScene, HudScene, LevelUpScene, ChestScene, VictoryScene, PauseScene, ResultScene],
  })
  await new Promise<void>((resolve) => game.events.once(Phaser.Core.Events.READY, () => resolve()))
  return game
}

interface RunReport {
  bossAt: number
  bossLevel: number
  survived: number
  level: number
  kills: number
  bossBeaten: boolean
  evolutions: number
  chests: number
  hpAt: string
}

async function playRun(levelId: LevelId, profile: Profile, maxSeconds: number, grumpier = false): Promise<RunReport> {
  clearSave()
  writeSave(profileSave(profile))
  const game = await boot()
  let now = 0
  const step = (): void => {
    now += STEP
    game.headlessStep(now, STEP)
  }
  for (let i = 0; i < 4; i++) step()
  game.scene.stop('Menu')
  game.scene.start('Game', { characterId: 'mochi', levelId, grumpier })
  for (let i = 0; i < 4; i++) step()

  const scene = game.scene.getScene('Game') as unknown as GameLike
  const hud = game.scene.getScene('Hud') as unknown as { stick?: { vector: { x: number; y: number } } }
  // Who's doing the damage: wrap hurtPlayer and tally the HP actually lost.
  const hurtBy = new Map<string, number>()
  const hurtable = scene as unknown as { hurtPlayer(amount: number, source?: { def: { id: string } }): void }
  const realHurt = hurtable.hurtPlayer.bind(scene)
  hurtable.hurtPlayer = (amount, source) => {
    const before = scene.hp
    realHurt(amount, source)
    const lost = before - scene.hp
    if (lost > 0) {
      const key = source ? source.def.id : 'shot'
      hurtBy.set(key, (hurtBy.get(key) ?? 0) + lost)
    }
  }
  const hpMarks: string[] = []
  let nextMark = 60
  let wanderAngle = 0

  const steer = (): void => {
    if (!hud.stick) return
    const px = scene.player.x
    const py = scene.player.y
    let vx = 0
    let vy = 0
    // Flee what's close, and circle round the crowd rather than running from it
    // in a straight line — that's how people actually play these games.
    let cx = 0
    let cy = 0
    let crowd = 0
    for (const e of scene.enemyGroup.getChildren()) {
      if (!e.active || e.def.behavior === 'still') continue
      const dx = px - e.x
      const dy = py - e.y
      const d2 = dx * dx + dy * dy
      if (d2 < 360 * 360) {
        cx += e.x
        cy += e.y
        crowd++
      }
      // Measured from the Grump's edge, not its middle: a boss is huge.
      const d = Math.sqrt(d2) || 1
      const gap = d - e.worldRadius
      if (gap > 140) continue
      const push = (e.def.isBoss ? 2.5 : 1) * (1 / Math.max(20, gap)) ** 1.5 * 3000
      vx += (dx / d) * push
      vy += (dy / d) * push
    }
    // Sidestep shots that are coming this way.
    for (const s of scene.foeShotGroup.getChildren()) {
      if (!s.active) continue
      const dx = px - s.x
      const dy = py - s.y
      const d = Math.hypot(dx, dy)
      if (d > 110) continue
      const sv = s.body.velocity
      const speed = Math.hypot(sv.x, sv.y) || 1
      if ((dx * sv.x + dy * sv.y) / (d * speed) < 0.6) continue // not heading for us
      // Step out of its path, whichever side we're already on.
      const side = Math.sign(-sv.y * dx + sv.x * dy) || 1
      vx += (-sv.y / speed) * side * 1.4
      vy += (sv.x / speed) * side * 1.4
    }
    if (crowd > 0) {
      const ax = px - cx / crowd
      const ay = py - cy / crowd
      const d = Math.hypot(ax, ay) || 1
      // Tangent to the crowd's centre: a steady orbit.
      vx += (-ay / d) * 0.6
      vy += (ax / d) * 0.6
    }
    // Drift towards the nearest goodie.
    let best: PickupLike | null = null
    let bestD = 320 * 320
    for (const p of scene.pickupGroup.getChildren()) {
      if (!p.active) continue
      const d = (p.x - px) ** 2 + (p.y - py) ** 2
      const weight = p.kind === 'chest' ? 0.25 : 1
      if (d * weight < bestD) {
        bestD = d * weight
        best = p
      }
    }
    if (best) {
      const dx = best.x - px
      const dy = best.y - py
      const d = Math.hypot(dx, dy) || 1
      vx += (dx / d) * 1.1
      vy += (dy / d) * 1.1
    }
    wanderAngle += (Math.random() - 0.5) * 0.3
    vx += Math.cos(wanderAngle) * 0.35
    vy += Math.sin(wanderAngle) * 0.35
    const m = Math.hypot(vx, vy) || 1
    hud.stick.vector.x = (vx / m) * Math.min(1, m)
    hud.stick.vector.y = (vy / m) * Math.min(1, m)
  }

  const answer = (): void => {
    if (game.scene.isActive('LevelUp')) {
      const s = game.scene.getScene('LevelUp') as unknown as { picked: boolean; choices: Choice[]; payload: { onPick(c: Choice): void }; scene: Phaser.Scenes.ScenePlugin }
      if (!s.picked) {
        s.picked = true
        // Prefer upgrading what you have, like most players do.
        const owned = s.choices.filter((c) => c.tag !== 'NEW!' && (c.kind === 'weapon' || c.kind === 'passive'))
        const pool = owned.length > 0 && Math.random() < 0.6 ? owned : s.choices
        const choice = pool[Math.floor(Math.random() * pool.length)]
        s.scene.stop()
        s.payload.onPick(choice)
      }
    }
    for (const key of ['Chest', 'Victory']) {
      if (!game.scene.isActive(key)) continue
      const s = game.scene.getScene(key) as unknown as { done: boolean; payload: { onDone?(): void; onContinue?(): void }; scene: Phaser.Scenes.ScenePlugin }
      if (s.done) continue
      s.done = true
      s.scene.stop()
      if (key === 'Chest') s.payload.onDone?.()
      else s.payload.onContinue?.()
    }
  }

  // How long each chest-carrier (and the boss) took to squish, in seconds.
  const championSeen = new Map<number, { name: string; from: number }>()
  const championTimes: string[] = []
  let bossBeaten = false
  let bossAt = 0
  let bossLevel = 0
  let evolutions = 0
  let chests = 0
  while (!game.scene.isActive('Result')) {
    steer()
    step()
    answer()
    if (!game.scene.isActive('Game') && !game.scene.isPaused('Game')) break
    for (const c of scene.champions) {
      if (c.active && !championSeen.has(c.uid)) championSeen.set(c.uid, { name: c.displayName, from: scene.ui.timeSec })
    }
    for (const [uid, info] of championSeen) {
      if (scene.champions.some((c) => c.uid === uid && c.active)) continue
      championTimes.push(`${info.name.replace(/ /g, '')}:${Math.round(scene.ui.timeSec - info.from)}s`)
      championSeen.delete(uid)
    }
    if (scene.bossBeaten && !bossBeaten) bossAt = Math.round(scene.ui.timeSec)
    if (!bossLevel && scene.ui.timeSec >= LEVELS[levelId].bossTime) bossLevel = scene.ui.level
    bossBeaten = scene.bossBeaten
    evolutions = scene.evolutionsThisRun.length
    chests = scene.chestsOpened
    if (scene.ui.timeSec >= nextMark) {
      hpMarks.push(`${Math.round(nextMark / 60)}m:${Math.round((scene.hp / scene.ui.maxHp) * 100)}%/L${scene.ui.level}`)
      nextMark += 60
    }
    if (scene.ui.timeSec >= maxSeconds) break
  }
  const report: RunReport = {
    bossAt,
    bossLevel,
    survived: Math.round(scene.ui.timeSec),
    level: scene.ui.level,
    kills: scene.ui.kills,
    bossBeaten,
    evolutions,
    chests,
    hpAt: `${hpMarks.join(' ')}  | ${championTimes.join(' ')}  | hurt: ${[...hurtBy.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k}:${Math.round(v)}`)
      .join(' ')}`,
  }
  game.destroy(true)
  return report
}

describe.skipIf(!ENABLED)('balance', () => {
  it('prints how runs go', async () => {
    const levels = (env.SIM_LEVELS?.split(',') as LevelId[] | undefined) ?? LEVEL_IDS
    const profiles = (env.SIM_PROFILES?.split(',') as Profile[] | undefined) ?? ['fresh', 'kid', 'maxed']
    const runs = Number(env.SIM_RUNS ?? 3)
    const cap = Number(env.SIM_CAP ?? 0)
    const grumpier = env.SIM_GRUMPIER === '1'
    for (const levelId of levels) {
      for (const profile of profiles) {
        const reports: RunReport[] = []
        for (let i = 0; i < runs; i++) reports.push(await playRun(levelId, profile, cap || LEVELS[levelId].bossTime + 180, grumpier))
        const times = reports.map((r) => r.survived).sort((a, b) => a - b)
        const wins = reports.filter((r) => r.bossBeaten).length
        console.log(
          `${levelId.padEnd(7)} ${profile.padEnd(6)}${grumpier ? ' 😠' : ''} survived ${times.join('/')}s (boss@${LEVELS[levelId].bossTime}) wins ${wins}/${runs}  ` +
            `lvl@boss ${reports.map((r) => r.bossLevel).join('/')} killed@ ${reports.map((r) => r.bossAt).join('/')} evo ${reports.map((r) => r.evolutions).join('/')} chests ${reports.map((r) => r.chests).join('/')}`,
        )
        for (const r of reports) console.log(`    ${r.hpAt}`)
      }
    }
    void loadSave
  }, 1_800_000)
})
