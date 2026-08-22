# Character sprite sheets

| File       | Form                        | Status                                      |
| ---------- | --------------------------- | ------------------------------------------- |
| `mmc.png`  | male main character (Boy)   | **generated** — do not hand-edit, see below |
| `fmc.png`  | female main character (Girl)| **generated** — do not hand-edit, see below |
| `wolf.png` | wolf                        | not supplied; game draws a placeholder      |

The humanoids have no names of their own: the player names their character on
the save slot, so the forms are just `mmc` and `fmc`.

Until a file exists at one of these paths the game generates a placeholder sheet
with the same layout and uses that instead, so it stays playable either way —
see `src/art/placeholderChars.ts`.

## The humanoid sheets are built, not dropped in

Both are produced from a single drawing each by
[`scripts/build-character-sheet.mjs`](../../scripts/build-character-sheet.mjs):

```bash
npm run sprites              # rebuild every sheet from art-source/
npm run sprites -- --debug   # also dump the keyed cutouts, for tuning
```

Anything you paint onto those PNGs by hand is lost the next time that runs.
Change the source art or the script instead.

To point the pipeline at new art for a character: save it over
`art-source/<form>-raw.png` (`sips -s format png in.jpeg --out out.png` converts
whatever the artist sent) and re-run. It expects one figure, facing the viewer,
on a plain light background. A new character needs one entry in the script's
`CHARACTERS` table — the defaults there suited both humanoids unchanged.

## Expected layout

A plain grid — no atlas, no trimming, no rotation. Every frame is the same size,
laid out row-major, 6 columns wide and 12 rows tall:

```
        col 0    col 1    col 2    col 3    col 4    col 5
row  0  idle facing down    (2 frames used)
row  1  idle facing left
row  2  idle facing right
row  3  idle facing up
row  4  walk facing down    (6 frames used)
row  5  walk facing left
row  6  walk facing right
row  7  walk facing up
row  8  attack facing down  (4 frames used)
row  9  attack facing left
row 10  attack facing right
row 11  attack facing up
```

Rows use their leftmost frames; unused cells at the end of a row can be blank.
Cell size is **per sheet** — the built sheets use 96 × 96 (so each is
576 × 1152), and the wolf placeholder uses the 64 × 64 default. That's
deliberate: each form can be replaced on its own without disturbing the others.

The character should stand on the same baseline in every frame, with its feet
about 6% of the frame height above the bottom edge — sprites are positioned by
their feet so they sort correctly against trees and each other.

## If hand-authored art doesn't match that

Don't redraw it. Change the numbers in
[`src/art/sheets.ts`](../../src/art/sheets.ts) instead:

- **Different cell size** → `frameWidth` / `frameHeight` on that form's entry.
- **Different grid** → `cols` / `rows`.
- **Rendered too big or small** → `display`, the height in world pixels (one
  map tile is 48).
- **Sitting too high or low** → `footFraction`.
- **Rows in a different order, or different frame counts** → `CLIP_LAYOUT`, or
  a per-form `clips` override for just the odd one out.

`src/__tests__/sheets.test.ts` checks that whatever you set still fits inside the
sheet, so a row number that walks off the end fails the build rather than showing
a blank frame mid-swing.
