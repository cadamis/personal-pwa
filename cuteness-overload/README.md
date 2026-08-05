# Cuteness Overload

A cute bullet-heaven for tablets, in the spirit of Vampire Survivors / Holocure:
you wander the Snuggle Meadow, your weapons fire on their own, and an
increasingly unreasonable number of Grumps try to hug you to death. Built for
kids: one-finger controls, no reading required beyond the level-up cards, and
nothing scary in it.

Play it at `https://<user>.github.io/personal-pwa/cuteness-overload/` once it's
deployed, or `npm run dev` locally.

## Playing

- **Move**: touch anywhere in the play area and drag. The stick appears wherever
  your finger lands, so it works left- or right-handed. Keyboard WASD / arrows
  work too.
- **Attack**: never. It happens by itself, aimed at whatever is nearest — but
  most weapons don't *track*, so where you stand decides what dies.
- **Level up**: walk over the pink hearts. Every level offers three cards (four
  if you're lucky) — tap one.
- **Sprinkles** 🍬 are the meta currency. They're kept whether you win or lose
  and spent in the Sprinkle Shop between runs.
- A run is five minutes. The Grumpy Gnome turns up at 2:00 and **Sir
  Fluffington** at 4:00 — squish him to win. The meadow is much bigger than the
  screen, so while a boss is off-screen a badge on the edge points at it.

## Shape of the code

```
src/
  main.ts              Phaser game config and the scene list (z-order matters)
  art/                 every sprite, drawn to canvas at boot — no image assets
    palette.ts         the one pastel palette
    draw.ts            canvas helpers (cute faces, sparkles, blush)
    textures.ts        one painter per sprite + the texture registry
  audio/sfx.ts         WebAudio blips, synthesised (no audio files either)
  data/                pure data, no Phaser: characters, weapons, passives,
                       enemies/waves, shop upgrades
  game/                pure logic, no Phaser: stats, save, loadout, level-up
                       pool, the weapon system, and the pooled entities
  scenes/              Boot, Menu, Shop, Game, Hud, LevelUp, Pause, Result
  ui/                  Button, Joystick, theme and layout helpers
```

Two conventions are worth knowing before changing anything:

**Art is generated, not drawn by a human.** `art/textures.ts` has one painter
function per sprite, drawing to a 2D canvas at `ART_SS`x the display size; every
sprite is therefore shown at `ART_SCALE`. The PWA icons are the same idea, built
by `scripts/gen-icons.mjs` (a from-scratch PNG encoder — `npm run icons`
regenerates them). If you add a sprite, add a painter; don't add a `.png`.

`art-preview.html` (dev only — Vite doesn't build it) paints the meadow plus a
crowd of sprites in a single frame, which is how to judge whether art changes
still read during a busy fight. **The backdrop is deliberately almost
featureless**: a handful of enormous, very low-contrast soft patches. Anything
small on it — tufts, flowers, a checker — turns into visual noise the moment a
hundred Grumps and several hundred projectiles are moving across it.

**The HUD is its own scene.** The game camera zooms so that every device sees a
fair slice of meadow, and a zoomed camera fights any UI drawn in the same scene.
`HudScene` renders at 1:1 and reads `GameScene.ui` once per frame. It also owns
the touch stick, which is why `GameScene` asks the HUD for its movement vector
rather than reading input directly.

**Adding a weapon** is usually just a new entry in `data/weapons.ts`: eleven
behaviours (homing, aimed, arc, orbit, spin, boomerang, nova, beam, turret,
bounce, rain) cover the twelve that exist, and `game/weaponSystem.ts` maps a
behaviour onto requests against a `WeaponHost`. Only reach for new code if none of
the eleven fit.

Note `aimed` vs `homing`: an aimed shot is fired *at* the nearest Grump and then
flies straight, so it can miss. Only Kitten Missiles actually tracks. Mochi's
Bubble Bark is deliberately `aimed` — a starter weapon that never misses does the
player's job for them.

## Tests

```bash
npm test
```

Three unit suites cover the data/logic layer (save parsing and shop purchases,
stat composition, the level-up pool's awkward cases). The fourth,
`run.smoke.test.ts`, boots the real game with Phaser's **HEADLESS** renderer and
steps a run frame by frame — waves spawn, Grumps die, hearts get collected,
level-up cards get picked, bosses appear, the run ends and sprinkles are banked.

Two things make that possible and are easy to break:

- `__tests__/setup.ts` installs a canvas context stub and a fake `Image`. Phaser
  probes canvas features at *module-init* time and its TextureManager waits on
  three base64 images before emitting `ready`, so without both stubs — installed
  before Phaser is imported — the game simply never boots and the test times out
  with no output.
- Drive frames with `game.headlessStep(time, delta)`, not `game.step()`. There's
  no renderer to `preRender()`.

The smoke test also steers the character on a wandering heading. That isn't
decoration: a stationary player never walks over hearts, and a player circling at
a *constant* radius settles into a pursuit equilibrium where the whole swarm
trails at a fixed distance forever, killing nothing and being hit by nothing.
Both look like passing tests while testing very little.

## Tuning

Difficulty lives in three places: `data/enemies.ts` (`WAVES`, per-Grump stats,
`MAX_LIVE_ENEMIES`), `difficultyAt()` in `game/stats.ts` (how much tougher things
get per minute), and the per-level tables in `data/weapons.ts`. The headless
harness is the cheapest way to check a change — a temporary test that runs each
character for five minutes and prints level/kills/HP/live-Grump counts at
intervals will tell you more in three seconds than a lot of manual play.

The shape it's tuned to, measured that way with a deliberately mediocre bot:

Medians of four runs each, because a single run varies by well over 2x and is not
something to tune on:

| | fresh save | after a few shop upgrades |
|---|---|---|
| never touches the screen | 25–122s | — |
| moving | 67–121s | 242–263s, i.e. into the boss fight |

Two rules follow from that and are easy to break by accident:

- **Nothing comes to the player on its own.** Hearts have to be walked over
  (`pickupRadius` is deliberately small) and weapons only reach what's already
  nearby (`nearestEnemies` is called with a few hundred pixels, not the whole
  screen). An earlier version drifted uncollected pickups towards the player to
  avoid "wasting" XP; the effect was that you could put the tablet down and
  still level up, which is the one thing this game must not do. `run.smoke.test.ts`
  has a test that fails if idle play survives.
- **Shop upgrades have to visibly convert into reach.** That's the whole
  rogue-lite loop, and it's the reason the game can afford to be unforgiving on
  a first run.
- **Crowds have to be worse than singles.** Contact damage is per Grump
  (`Enemy.nextTouchAt`), throttled globally by `HURT_GATE` so a wall of Grumps is
  about five times as dangerous as one rather than infinitely so. With a single
  shared cooldown — which is how this started — being mobbed by fifty Grumps hurt
  exactly as much as being brushed by one, and standing still was a viable
  strategy.

One trap worth knowing about if you touch the orbit weapons (Snuggle Spikes,
Sassy Goose, Cone-nado): the satellites use a **swept-arc** hit test, not a point
test. Three spikes on a ring only revisit a given angle about once a second, while
a Grump crosses the spike band in roughly half that, so a point test lets most of
them walk through the ring untouched — and widening the ring makes it *worse*,
because the same satellites cover a longer circumference. Fixing this took the
tank character's median survival from 41s to 99s.
