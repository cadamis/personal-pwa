# Cuteness Overload

A cute bullet-heaven for tablets, in the spirit of Vampire Survivors / Holocure:
you wander five little worlds, your weapons fire on their own, and an
increasingly unreasonable number of Grumps try to hug you to death. Built for
kids: one-finger controls, no reading required beyond the cards, and nothing
scary in it.

Play it at `https://<user>.github.io/personal-pwa/cuteness-overload/` once it's
deployed, or `npm run dev` locally.

## Playing

- **Move**: touch anywhere in the play area and drag. The stick appears wherever
  your finger lands, so it works left- or right-handed. Keyboard WASD / arrows
  work too.
- **Attack**: never. It happens by itself, aimed at whatever is nearest — but
  most weapons don't *track*, so where you stand decides what dies.
- **Level up**: walk over the hearts (they get bigger and change colour as they
  carry more XP). Every level offers three cards (four if you're lucky). The
  shop sells a 🎲 reroll and a 🙅 "no thanks" that banishes one card for the
  rest of the run.
- **Evolve**: every weapon has a *buddy* passive, printed on its card. Get the
  weapon to its top level, own its buddy, and the next treasure chest turns it
  into its evolution (Bubble Bark + Twin Braids = Bubble Bath, and so on —
  sixteen recipes, tracked in the Sticker Book).
- **Treasure chests** come from elites (big versions of ordinary Grumps, wearing
  a crown) and mini-bosses, and every boss drops one. A chest holds one, three
  or five prizes; an evolution always comes first.
- **Presents** are scattered about: pop one with any weapon for a snack, a bag
  of sprinkles, a big heart, or a power-up — 🧲 Friendship Magnet (every heart
  on the level flies to you), 💣 Cuddle Bomb (squishes everything on screen), or
  🌙 Nap Time (every Grump dozes off for six seconds).
- **A run** builds to a boss at 7–10 minutes depending on the level. Beat it and
  you've won; then you can head home or **keep going** in endless mode for extra
  sprinkles, more chests and the survival stickers, until you drop or it's
  bedtime (30:00).
- **Five levels**, each unlocked by beating the one before: Snuggle Meadow,
  Grumbly Forest (bushes block everything), Frosty Peaks, Candy Carnival and
  Starlight Dreamland. Later levels ramp harder and pay more. Beating a level's
  boss also unlocks its **Grumpier** mode: tougher, busier, and 1.6x the pay.
- **Sprinkles** 🍬 are kept whether you win or lose and spent in the Sprinkle
  Shop. The **Sticker Book** has 44 stickers; almost every one gives something —
  a new friend, a new weapon in the card pool, a new shop item, or sprinkles.

## Shape of the code

```
src/
  main.ts              Phaser game config and the scene list (z-order matters)
  art/                 every sprite, drawn to canvas at boot — no image assets
    palette.ts         the one palette, plus hue-shifted shade()/tint()/inkOf()
    draw.ts            the drawing kit: parts, shading, faces, glows, shadows
    textures.ts        the sprite registry, animation frames, buildTextures()
    sprites/           the painters: crew, grumps (+2), projectiles, evolutions,
                       fx, world (+2), ui
  audio/sfx.ts         WebAudio blips, synthesised (no audio files either)
  data/                pure data, no Phaser: characters, weapons (and their
                       evolutions), passives, enemies (and boss moves), levels,
                       shop upgrades, stickers
  game/                pure logic, no Phaser scene: stats, save, loadout,
                       level-up pool and chests, the weapon system, boss moves,
                       and the streamers (obstacles, decals, presents)
  scenes/              Boot, Menu, StageSelect, Shop, StickerBook, Game, Hud,
                       LevelUp, Chest, Victory, Pause, Result
  ui/                  Button, Joystick, theme and layout helpers
```

Conventions worth knowing before changing anything:

**Art is generated, not drawn by a human.** Every sprite is a painter function
drawing to a 2D canvas at `ART_SS`x its display size; show sprites at
`ART_SCALE` (or `artScale(key)`, which also undoes the pre-zoom that bosses are
painted at — a boss shown at 2.4x is *painted* at 2.4x rather than stretched).
If you add a sprite, add a painter; don't add a `.png`. The PWA icons are the
same idea, built by `scripts/gen-icons.mjs` (`npm run icons`).

The house style is "vinyl sticker", and `draw.ts` does most of it for you:
build a character from a list of `Part`s (`ell(...)`, `shape(...)`) and call
`paintParts`, which draws one shared silhouette outline, then fills each part
with a top-left key light and a hard, hue-shifted shadow crescent. Faces come
from `eyes()` / `mouth()` / `blush()` / `nose()`; everything that stands on the
floor gets a `groundShadow()` (fainter and lower for flyers). Friends face right
with a warm, glossy look; Grumps face right too, with half-lidded `grumpy` eyes
and a pout or a fang, and every one has two animation frames (`anim()` in the
registry). Outlines are never black — each is its fill darkened towards plum.

`art-preview.html` (dev only, not built) has two modes. With no query it's an
art review page: every sprite, grouped the way you meet them, animated on its
own world's floor, with a notes box under each and a "Copy notes" button that
gathers them into a list to paste back to an agent. It also flags any sprite
whose art touches the edge of its canvas, which almost always means it's
cropped: give that painter room with `makeCanvas`'s `pad` argument, which hit
sizes ignore (see `artWidth`). `?crowd` paints all five floors with a busy
crowd on each at in-game scale: that's how to judge whether an art change
still reads mid-fight. **Floors and
decorations must stay lower-contrast than anything that moves.** The floors are
value-compressed, and ground decals (flowers, leaves, pawprints) are drawn close
to the floor's own colour — anything louder turns into noise under a hundred
Grumps.

**A level is data.** `data/levels.ts` holds the wave table, the scripted events
(rings, stampedes, elites, mini-bosses, the boss, banners), the difficulty ramp,
the floor, obstacles, decals, presents, the payout multiplier and the unlock
rule. `GameScene` reads all of it, so another level is another entry.

**The world is streamed, not placed.** It's endless, so there's no layout to
generate up front. Obstacles (`game/obstacles.ts`), decals (`game/decor.ts`) and
presents (`game/props.ts`) all make a grid cell's contents a pure hash of its
coordinates: walk away and back and the same bushes are there, and nothing
appears on top of you because a cell only materialises off-screen. Presents are
remembered once popped. Enemies that walk into a bush sidestep for half a second
(`Enemy.detourTimer`), flyers go over the top, and beams are truncated by
`ObstacleField.rayDistance` so they don't shine through cover.

**Presents are Grumps.** A present is a `still` `Enemy`, so every weapon can
already hit it. Anything that aims, counts, chases or takes bumps skips `still`
Grumps — if you add a new way of finding enemies, skip them too.

**Modals queue.** Level-ups, chests, the victory screen and pause all go through
`GameScene.openModal()`, which pauses the run and shows them one at a time. Each
modal calls back, and `closeModal()` shows the next or resumes.

**The HUD is its own scene.** The game camera zooms so every device sees a fair
slice of world, and a zoomed camera fights any UI drawn in the same scene.
`HudScene` renders at 1:1 and reads `GameScene.ui` once per frame. It also owns
the touch stick, which is why `GameScene` asks the HUD for its movement vector.

**Adding a weapon** is usually just a new entry in `data/weapons.ts`: fifteen
behaviours (homing, aimed, arc, orbit, spin, boomerang, nova, beam, turret,
bounce, rain, shield, aura, strike, puddle) cover thirty-two weapons, and
`game/weaponSystem.ts` maps a behaviour onto requests against a `WeaponHost`.
Give a base weapon an `evolution: { into, needs }` and add the evolved entry
(one level, `evolvedFrom`); evolutions reuse their base behaviour with bigger
numbers and a few flags (`rings`, `dome`, `heal`, `fx`, `prop`).

Two entries break the mould, and the tests know about both. **Brave Brolly** is
the only weapon with three levels and the only one that deals no damage — a
timed umbrella carried on the far side of the player from wherever they're
heading, eating enemy projectiles (only enemy ones). Its `cooldown` is the wait
*after* it closes, so `cycleMs` adds the up-time back on. Its evolution, the
Rainbow Parasol, is a `dome`: centred on the player, blocking from every side,
and shoving Grumps out.

Note `aimed` vs `homing`: an aimed shot is fired *at* the nearest Grump and then
flies straight, so it can miss. Only Kitten Missiles (and Comet Kittens) track.
Mochi's Bubble Bark is deliberately `aimed` — a starter weapon that never misses
does the player's job for them.

**Bosses have moves.** `EnemyDef.moves` lists special attacks (burst, spread,
summon, charge), each on its own timer in `game/bossBrain.ts`. Every move is
telegraphed — the boss puffs up and a red ring pulses out — before it fires.
Mini-bosses use the same system with fewer moves.

**Stickers are pure functions of the save.** `data/stickers.ts` checks lifetime
records (in `SaveData`) and, at the end of a run, a `RunSummary`.
`awardStickers()` hands out anything newly earned with its reward; the menu also
runs it on arrival, so a save from before stickers existed is back-filled from
its old records. Weapons, friends and shop items locked behind a sticker are
found by looking the reward up (`weaponUnlockSticker` and friends), so there's
one place to change an unlock.

**Saves only ever grow.** The storage key is still `v1`: every field added since
is optional in storage and parsed defensively in `parseSave`, so an old save
loads with everything it had. Keep it that way.

## Tests

```bash
npm test
```

Three unit suites cover the data/logic layer: save parsing, migration and shop
purchases; stickers; stat composition; the level-up pool, evolutions and chests.
They also cross-check the data against the art registry — every texture a
friend, Grump, boss move, weapon, level or scene asks for must have a painter —
because a typo there is invisible until something renders as a missing-texture
square mid-run. The fourth, `run.smoke.test.ts`, boots the real game with
Phaser's **HEADLESS** renderer and steps runs frame by frame: waves spawn,
Grumps die, hearts get collected, cards get picked, chests open and evolve a
weapon, presents pop, a boss dies and endless begins, every level runs with its
boss using its moves, and every one of the thirty-two weapons fires.

Two things make that possible and are easy to break:

- `__tests__/setup.ts` installs a canvas context stub and a fake `Image`. Phaser
  probes canvas features at *module-init* time and its TextureManager waits on
  three base64 images before emitting `ready`, so without both stubs — installed
  before Phaser is imported — the game simply never boots and the test times out
  with no output. The stub answers unknown methods with a no-op returning
  `undefined`, so a painter that relies on a return value it doesn't list (say,
  `createConicGradient`) crashes the boot in tests.
- Drive frames with `game.headlessStep(time, delta)`, not `game.step()`. There's
  no renderer to `preRender()`. That also means the camera's `worldView` never
  updates in tests, so anything streamed around the view stays near the origin.

The smoke test also steers the character on a wandering heading. That isn't
decoration: a stationary player never walks over hearts, and a player circling at
a *constant* radius settles into a pursuit equilibrium where the whole swarm
trails at a fixed distance forever, killing nothing and being hit by nothing.

## Tuning

Difficulty lives in a few places: `data/enemies.ts` (per-Grump stats, boss moves,
`MAX_LIVE_ENEMIES`), `data/levels.ts` (waves, events, `ramp`, `GRUMPIER`, the
endless constants), `difficultyAt()` / `xpToNext()` in `game/stats.ts`, the
per-level tables in `data/weapons.ts`, and `championHpMult()` in `GameScene`.

**Measure, don't guess.** `src/__tests__/tuning.sim.test.ts` is a balance
harness that plays whole runs headlessly and prints survival, wins, level at the
boss, time-to-kill for every chest-carrier and boss, and *who did the damage*:

```bash
SIM=1 npx vitest run src/__tests__/tuning.sim.test.ts --reporter=verbose
SIM=1 SIM_LEVELS=candy SIM_PROFILES=kid,maxed SIM_RUNS=6 npx vitest run src/__tests__/tuning.sim.test.ts --reporter=verbose
```

(`SIM_GRUMPIER=1` plays Grumpier mode; `SIM_CAP=1800` lets runs go on into
endless.) Its bot kites round the crowd, sidesteps shots coming its way, drifts
towards hearts and chests, and picks cards at random with a lean towards what it
owns. Profiles: `fresh` (nothing bought), `kid` (the original eleven shop items
bought out — where a returning player is), `maxed` (everything).

What it measured when this was last tuned (four runs each, so treat as rough):

| wins | meadow | forest | peaks | candy | dream |
|---|---|---|---|---|---|
| fresh | 0 (dies ~3–6 min) | 0 | — | — | — |
| kid | ~3/4 | 3/4 | 3/4 | 3/4 | 2/4 |
| maxed | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 |
| maxed, Grumpier | 3/3 | 2/3 | 3/3 | 1/3 | 2/3 |

Endless with a maxed save lasts roughly 16–25 minutes; bedtime is meant to be a
rare feat. Boss fights take roughly 20–90 seconds.

Rules the tuning follows, which are easy to break by accident:

- **Nothing comes to the player on its own.** Hearts have to be walked over
  (`pickupRadius` is deliberately small), weapons only reach what's nearby, and
  chests and power-ups must be walked right up to. The Friendship Magnet is the
  one exception, and it's a pickup you have to go and get. `run.smoke.test.ts`
  fails if idle play survives.
- **Shop upgrades have to visibly convert into reach.** That's the rogue-lite
  loop, and it's why a first run can be unforgiving.
- **Crowds have to be worse than singles.** Contact damage is per Grump
  (`Enemy.nextTouchAt`), throttled globally by `HURT_GATE`.
- **Every level starts soft.** The later levels' ordinary Grumps have
  meadow-sized HP; what makes a level harder is its ramp, its density and what
  its Grumps do. Early versions gave them 2–4x the HP, and a starter weapon
  couldn't get a run going at all.
- **Shots are the dangerous part, so they ramp gently.** The harness showed enemy
  projectiles doing nearly all the damage in the later levels, so enemy shots and
  champions' contact damage get half the level's damage ramp, and the late mixed
  waves leave the shooters out.
- **Bosses scale with the player's level** (`championHpMult`), because a build's
  damage grows much faster than a linear ramp; without it a strong run deletes a
  boss in two seconds.
- **Evolutions have to be findable.** The XP curve is tuned so a decent run is
  in the high thirties by the boss, and a passive that's the buddy of a weapon
  you carry is weighted up on the cards.

One trap worth knowing if you touch the orbit weapons (Snuggle Spikes, Sassy
Goose, their evolutions, Cone-nado): the satellites use a **swept-arc** hit
test, not a point test. Three spikes on a ring only revisit a given angle about
once a second, while a Grump crosses the spike band in roughly half that, so a
point test lets most of them walk through the ring untouched — and widening the
ring makes it *worse*.
