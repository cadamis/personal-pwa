# The Last Hybrid

A top-down 2D adventure in a haunted wood. You're the last of something that
was both human and wolf, and you can still switch between the two.

Built for a tablet first: on-screen stick and buttons, a gamepad if one is
plugged in, and WASD for testing at a desk. All three work at once — pick up a
controller mid-session and it just takes over.

```bash
npm install
npm run dev
```

| Command             | Does                                               |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Vite dev server                                    |
| `npm run build`     | Typecheck, then build to `dist/`                   |
| `npm run test`      | Unit tests (saves, map data, sheets, input, combat) |
| `npm run typecheck` | `tsc --noEmit`                                     |
| `npm run sprites`   | Rebuild character sheets from `art-source/`        |
| `npm run icons`     | Regenerate the PWA icons                           |

## Where it's at

Playable end to end, but early — this is the infrastructure, not the game.

- **Three save slots**, in the shape of the file select on the original Zelda.
- An opening cinematic: hunters ring the character, the ground opens, they fall
  into the Hollow. Skippable with a tap, a key or any gamepad button.
- Two areas: **The Hollow** (the base camp, with a campfire you can rest at)
  and **The Deepwood** to the north, with enemies in it.
- Three forms, two enemy types, melee combat with a dash, death and respawn at
  the fire.
- Next up: more areas off the Deepwood, and bosses.

## Saves and the way in

```
boot → title (three slots)
         ├─ empty slot  → create (form + name) → intro → world
         └─ saved slot  → world, where they left off
world → pause → "Save and quit" → title
```

The intro plays **once**, for a character who has just been created — it's an
origin story, not something to sit through every session. The file select knows
which by way of `isFreshSlot`: a character who has never been played has no
saved position yet.

The game saves on the way out of the world scene, and also whenever the tab is
hidden. That second one matters more than it sounds: on a tablet the usual way
to stop playing is to switch apps, which never runs a scene shutdown, so waiting
for one would quietly lose the session.

[src/game/save.ts](src/game/save.ts) is pure and Phaser-free, and it's the one
part of the game that reads data it didn't write — anything at all can be in
local storage. Every field goes through `sanitizeSlot` on the way in, and the
tests lean on the rejection cases, because a slot that passes validation holding
nonsense doesn't fail there: it fails several scenes later, as a player standing
outside the map.

Names are entered on a letter grid rather than an HTML input, because the game
is played three ways and a real text field leaves a gamepad with no way to type
at all. A physical keyboard can still just type — see
[src/ui/NameEntry.ts](src/ui/NameEntry.ts).

## The intro

It stars the character whose slot it was launched from. Its choreography lives in [src/game/introScript.ts](src/game/introScript.ts):
five beats with durations, and the ring the hunters close onto. The scene reads
absolute start times out of that and hangs one timer off each beat, which is
what makes skipping a matter of cancelling timers rather than unwinding a chain
of callbacks. To re-cut it — longer fall, shorter stare-down, more hunters —
change the numbers there, not the scene.

Two things about it are worth knowing before you touch the staging:

- **It's composed on a fixed 960 × 640 stage** that's scaled to the viewport, so
  every position is authored once and holds on any screen.
- **The stage is fitted by *area*, not `cover`.** A cover fit crops on the
  narrow axis, which on a portrait tablet was enough to push the entire ring of
  hunters off the sides. Matching area trades a little width for height as the
  screen gets taller, and the ring is additionally clamped to whatever is
  actually visible.

The hunters, the pit and the shaft are in
[src/art/introArt.ts](src/art/introArt.ts) — kept apart from the world art
because none of it belongs in the game proper. Everything else the intro shows
(ground, trees, the campfire, her own sprite sheet) is the real thing, so the
opening can't drift away from how the game actually looks.

## Controls

| Action     | Touch                  | Gamepad     | Keyboard      |
| ---------- | ---------------------- | ----------- | ------------- |
| Move       | Left half of screen    | Stick/d-pad | WASD, arrows  |
| Attack     | ⚔                      | A / RT      | Space, J      |
| Dash       | »                      | B / RB      | Shift, K      |
| Shift form | ☾                      | Y / LB      | Q, Tab        |
| Use        | ✦ (appears when close) | X           | E, L          |
| Pause      | ❚❚ (top right)         | Start       | Esc, P        |

The movement stick has no fixed position — put a thumb down anywhere in the
left half and it appears there. The dash grants a few invulnerable frames, so
it's the dodge button as much as it is a movement one.

## The three forms

`mmc` and `fmc` are the male and female main characters, shown as **Boy** and
**Girl** when you create one. They have no names in the code on purpose — the
player names their character on the save slot, and a second name baked in would
only ever contradict it.

Everything that differs between them is a row in `FORMS`
([src/game/forms.ts](src/game/forms.ts)) — speed, reach, arc, damage, how hard
you are to hurt. You choose a humanoid shape when you create a character and
it's fixed for that save; the wolf is the one you shift into and out of
mid-fight. It's much faster and much more fragile.

## Getting the real artwork in

The character art is the one thing here designed to be swapped wholesale. Each
form loads from `public/sprites/<form>.png`; if the file isn't there the loader
404s and the game draws a stand-in sheet with an identical frame grid, so
nothing downstream can tell the difference. **Both humanoids are real art now;
the wolf is still a placeholder.**

**See [public/sprites/README.md](public/sprites/README.md) for the file names
and the expected grid.** If a delivered sheet is laid out differently, change
the numbers in [src/art/sheets.ts](src/art/sheets.ts) rather than redrawing
anything — that file is the only place frame positions are defined, cell size is
per form, and a test checks whatever you put there still fits inside the sheet.

### Building a sheet from one drawing

`npm run sprites` turns a single figure on a plain background into a full
72-frame sheet: it keys the background out, finds where the character stands,
and poses the whole figure per frame — bob, lean, squash and lunge, timed as a
gait. Side views turn the head toward the direction of travel and narrow the
figure; the back view stamps a patch of the character's own hair over the face.
Adding a character is one entry in the script's `CHARACTERS` table.

That is deliberately not a skeletal rig, and the reason is in
[scripts/build-character-sheet.mjs](scripts/build-character-sheet.mjs): the tail
sweeps across both the hip line and the right leg, so every rectangle containing
a leg also contains tail, and cutting the figure into limbs tore or ghosted on
every posed frame. **A real per-limb walk needs more source art — a few drawn
poses per facing — not a cleverer script.** What's there now reads well at the
~52px this actually renders at, but the legs don't alternate.

The pipeline has no dependencies: [scripts/lib/png.mjs](scripts/lib/png.mjs) is
a PNG codec over node's zlib, and [scripts/lib/raster.mjs](scripts/lib/raster.mjs)
does the keying and compositing.

The placeholders in [src/art/placeholderChars.ts](src/art/placeholderChars.ts)
are deliberately crude. They only need to answer "which way am I facing, am I
walking, did my swing come out" — nobody should spend time on them.

Everything *else* in the world (trees, ground, enemies, UI) is also drawn in
code, in [src/art/worldArt.ts](src/art/worldArt.ts), but those aren't
placeholders. A tree is a tree.

## Adding a map area

Areas are ASCII grids in [src/world/areas.ts](src/world/areas.ts):

```
  .  walkable ground          T  tree            b  bush
  ,  packed dirt / path       t  dead tree       R  rock
  ~  bog (walkable, slow)     #  dense thicket   F  campfire
```

To add one: write the grid, give it a `spawns` entry to arrive at, and point an
`exits` entry at it from an existing area. Nothing else needs to know it
exists — the scene builds the ground, the collision bodies and the scenery from
the grid.

The tests catch the mistakes that grids invite and the running game doesn't:
a row a character short, an exit pointing at a spawn that doesn't exist, an
enemy standing inside a tree.

## How it fits together

```
src/
  art/          palette, canvas helpers, placeholder sheets, world art, intro art
  entities/     Player, Enemy
  game/         constants, forms, enemies, combat maths, intro script, save slots
  input/        action vocabulary, keyboard+gamepad reader, touch layer
  ui/           theme and shared widgets, including the name-entry grid
  scenes/       Boot, Title (file select), CreateCharacter, Intro, World, Hud, Pause
  world/        area data (ASCII maps), and turning one into scene objects
```

A few decisions worth knowing before changing things:

- **One world scene, many areas.** Walking through a doorway tears down the
  area and builds the next one under a player, camera and input rig that
  persist. Restarting a scene per doorway would rebuild the input manager every
  time — and drop a held stick in the process.
- **The touch controls live in the HUD scene**, not the world scene. The world
  camera is zoomed, and a `scrollFactor(0)` object on a zoomed camera is still
  scaled by that zoom, which walks the buttons off the corner of the screen.
  It also puts every interactive object in one scene, so nothing can swallow a
  tap meant for the stick.
- **The player doesn't know what it's fighting.** While a swing is live it
  publishes a `Strike` and the scene decides who that touches, so a new enemy
  — or a breakable crate, or a boss weak point — doesn't mean editing the
  player.
- **The logic that's easy to get wrong is Phaser-free**, so it can be tested
  directly: input merging, map parsing, swing resolution (`game/combat.ts`,
  where angle wrapping at ±π quietly turns a forward swing into a backward one),
  and the intro's choreography — a beat that fires early or a hunter who starts
  on screen instead of walking in is a test failure, not something you have to
  catch by re-watching a twelve-second animation.

## Notes

- Icons are generated, not drawn: `npm run icons` rasterises the PNGs from
  scratch with node's zlib. `public/icon.svg` and `icon-maskable.svg` are
  hand-written to the same design — change one, change both.
- Set `physics.arcade.debug: true` in [src/main.ts](src/main.ts) to see the
  collision boxes the ASCII maps generate.
- In a dev build the game instance is on `window.game`, which is handy for
  poking at scene state from the console. It's stripped from `npm run build`.
