/**
 * The three shapes the Last Hybrid wears.
 *
 * The two humanoid forms are chosen once, when a character is created; the wolf
 * is the tactical one you shift into mid-fight. Everything that differs between
 * them is a number in this table, so tuning the game never means editing the
 * player entity.
 *
 * `mmc` and `fmc` are the male and female main characters. They deliberately
 * have no names of their own — the player names their character on the save
 * slot, and a second name baked into the code would only ever contradict it.
 * `name` here is a label for the form, not for the person.
 */

export const FORM_IDS = ['mmc', 'fmc', 'wolf'] as const
export type FormId = (typeof FORM_IDS)[number]

/** The forms you can pick when creating a character. Excludes the wolf. */
export const HUMANOID_IDS = ['mmc', 'fmc'] as const
export type HumanoidId = (typeof HUMANOID_IDS)[number]

export interface Form {
  id: FormId
  name: string
  /** One-line description, shown on the form-select screen. */
  blurb: string
  /** Top speed in world px/sec. */
  speed: number
  /** Radius of the physics body, in px. */
  bodyRadius: number
  damage: number
  /** How far the swing reaches past the body edge, in px. */
  reach: number
  /** Half-angle of the swing arc, in radians. A wide arc hits crowds. */
  arc: number
  /** Minimum time between swings, in ms. */
  attackCooldown: number
  /** How long the hitbox is live, in ms. */
  attackActiveMs: number
  /** Multiplier on incoming damage — the wolf is fast but fragile. */
  vulnerability: number
  /** Dash impulse speed, px/sec, and how long it lasts. */
  dashSpeed: number
  dashMs: number
  dashCooldown: number
}

export const FORMS: Record<FormId, Form> = {
  mmc: {
    id: 'mmc',
    name: 'Boy',
    blurb: 'Broad-shouldered. Hits harder, turns slower.',
    speed: 168,
    bodyRadius: 12,
    damage: 3,
    reach: 26,
    arc: 0.95,
    attackCooldown: 420,
    attackActiveMs: 130,
    vulnerability: 1,
    dashSpeed: 430,
    dashMs: 170,
    dashCooldown: 620,
  },
  fmc: {
    id: 'fmc',
    name: 'Girl',
    blurb: 'Quick-footed. A faster, wider swing.',
    speed: 182,
    bodyRadius: 11,
    damage: 2,
    reach: 30,
    arc: 1.15,
    attackCooldown: 330,
    attackActiveMs: 120,
    vulnerability: 1,
    dashSpeed: 460,
    dashMs: 165,
    dashCooldown: 540,
  },
  wolf: {
    id: 'wolf',
    name: 'The Wolf',
    blurb: 'Fast, savage, and thin-skinned. Lunges instead of swings.',
    speed: 268,
    bodyRadius: 13,
    damage: 3,
    reach: 20,
    arc: 0.6,
    attackCooldown: 300,
    attackActiveMs: 110,
    vulnerability: 1.5,
    dashSpeed: 620,
    dashMs: 190,
    dashCooldown: 430,
  },
}

/**
 * Widens a string read back from storage into a `FormId`.
 *
 * This is the one guarded place persisted data crosses into the typed world —
 * see the note on `noUncheckedIndexedAccess` in the repo's CLAUDE.md.
 */
export function asHumanoidId(value: string | null): HumanoidId | null {
  return HUMANOID_IDS.includes(value as HumanoidId) ? (value as HumanoidId) : null
}
