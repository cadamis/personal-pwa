export type ExerciseKind = 'reps' | 'timed' | 'per-side-reps' | 'per-side-timed'

export interface Exercise {
  id: string
  name: string
  cue: string
  kind: ExerciseKind
  baseline: number
  sets: number
  restSeconds: number
  category: 'push' | 'core' | 'legs' | 'posterior' | 'mobility' | 'yoga'
}

export type SessionTag = 'strength-a' | 'strength-b' | 'mobility' | 'micro'

export type SessionFormat = 'circuit' | 'sequence'

export interface Session {
  id: string
  tag: SessionTag
  title: string
  subtitle: string
  minutes: number
  exerciseIds: string[]
  meetingSafe: boolean
  format: SessionFormat
}

export const EXERCISES = {
  pushups: {
    id: 'pushups',
    name: 'Push-ups',
    cue: 'Hands under shoulders, body straight, chest to fist-height. Knees down is fine to hit the target.',
    kind: 'reps',
    baseline: 10,
    sets: 3,
    restSeconds: 60,
    category: 'push',
  },
  crunches: {
    id: 'crunches',
    name: 'Crunches',
    cue: 'Knees bent, feet flat (no anchor needed), curl shoulder blades off the floor, exhale at the top.',
    kind: 'reps',
    baseline: 30,
    sets: 3,
    restSeconds: 60,
    category: 'core',
  },
  plank: {
    id: 'plank',
    name: 'Plank',
    cue: 'Face down, prop up onto forearms (elbows under shoulders) and toes, then lift your hips and thighs off the floor into one straight line from head to heels. Squeeze glutes to keep hips from sagging, tuck ribs to flatten your lower back, neutral neck.',
    kind: 'timed',
    baseline: 20,
    sets: 3,
    restSeconds: 45,
    category: 'core',
  },
  superman: {
    id: 'superman',
    name: 'Superman hold',
    cue: 'Lie face down, arms reaching straight overhead, legs straight behind you. Lift your arms, chest, and legs a few inches off the floor at the same time, squeezing glutes and lats to hold the lift. Reach long through fingers and toes rather than cranking your neck back — only your hips and stomach stay on the ground.',
    kind: 'timed',
    baseline: 20,
    sets: 3,
    restSeconds: 30,
    category: 'posterior',
  },

  squats: {
    id: 'squats',
    name: 'Bodyweight squats',
    cue: 'Feet shoulder-width, knees track over toes, chest up.',
    kind: 'reps',
    baseline: 15,
    sets: 3,
    restSeconds: 60,
    category: 'legs',
  },
  lunges: {
    id: 'lunges',
    name: 'Reverse lunges',
    cue: 'Step back, drop the trailing knee toward the floor, drive off the front heel.',
    kind: 'per-side-reps',
    baseline: 8,
    sets: 3,
    restSeconds: 60,
    category: 'legs',
  },
  glutebridge: {
    id: 'glutebridge',
    name: 'Glute bridges',
    cue: 'Feet flat, drive hips up, squeeze glutes, pause at the top.',
    kind: 'reps',
    baseline: 15,
    sets: 3,
    restSeconds: 45,
    category: 'posterior',
  },
  wallsit: {
    id: 'wallsit',
    name: 'Wall sit',
    cue: 'Back flat on the wall, thighs parallel to the floor.',
    kind: 'timed',
    baseline: 30,
    sets: 3,
    restSeconds: 45,
    category: 'legs',
  },

  catcow: {
    id: 'catcow',
    name: 'Cat / cow',
    cue: 'On hands and knees, wrists under shoulders, knees under hips. Inhale: drop your belly, lift head and tailbone (cow). Exhale: round your spine up, tuck your chin (cat). Flow slowly between the two, one vertebra at a time.',
    kind: 'timed',
    baseline: 60,
    sets: 1,
    restSeconds: 15,
    category: 'mobility',
  },
  downdog: {
    id: 'downdog',
    name: 'Downward-facing dog',
    cue: 'From hands and knees, tuck your toes and lift your hips up and back, straightening into an inverted V. Hands shoulder-width, heels reaching toward the floor, head relaxed between your arms.',
    kind: 'timed',
    baseline: 45,
    sets: 2,
    restSeconds: 15,
    category: 'yoga',
  },
  lowlunge: {
    id: 'lowlunge',
    name: 'Low lunge with rotation',
    cue: 'Kneel in a lunge: one foot planted forward (knee bent ~90°), the other knee down on the floor behind you. Rotate your torso toward the front leg and reach that side\'s arm up toward the ceiling, hips square.',
    kind: 'per-side-timed',
    baseline: 30,
    sets: 1,
    restSeconds: 10,
    category: 'yoga',
  },
  forwardfold: {
    id: 'forwardfold',
    name: 'Standing forward fold',
    cue: 'Stand with feet hip-width, knees soft. Hinge forward from your hips, letting your head and arms hang heavy toward the floor. Don\'t force your hands to reach the ground — bent knees are fine.',
    kind: 'timed',
    baseline: 60,
    sets: 1,
    restSeconds: 10,
    category: 'yoga',
  },
  seatedfold: {
    id: 'seatedfold',
    name: 'Seated forward fold',
    cue: 'Sit with legs extended straight in front of you. Hinge forward from your hips (not your waist), reaching toward your feet while keeping your spine long. Stop wherever you feel a stretch — do not force it.',
    kind: 'timed',
    baseline: 60,
    sets: 1,
    restSeconds: 10,
    category: 'yoga',
  },
  cobra: {
    id: 'cobra',
    name: 'Cobra / low upward dog',
    cue: 'Lie face down, hands under your shoulders, elbows close to your body. Press through your hands to lift your chest off the floor, keeping your hips down and shoulders away from your ears.',
    kind: 'timed',
    baseline: 30,
    sets: 2,
    restSeconds: 10,
    category: 'yoga',
  },
  pigeon: {
    id: 'pigeon',
    name: 'Pigeon pose',
    cue: 'Sit with one leg bent in front of you, shin angled across your body, and the other leg extended straight behind you. Keep hips square to the floor and breathe into the stretch — use your hands on the floor for support.',
    kind: 'per-side-timed',
    baseline: 45,
    sets: 1,
    restSeconds: 10,
    category: 'yoga',
  },
  childs: {
    id: 'childs',
    name: "Child's pose",
    cue: 'Kneel and sit back onto your heels, then fold forward, laying your torso between your knees with arms extended forward on the floor. Big toes together, knees wide, forehead down, long slow exhales.',
    kind: 'timed',
    baseline: 60,
    sets: 1,
    restSeconds: 0,
    category: 'yoga',
  },

  shoulderrolls: {
    id: 'shoulderrolls',
    name: 'Shoulder rolls',
    cue: 'Big slow circles — 5 back, 5 forward. Meeting-safe.',
    kind: 'timed',
    baseline: 30,
    sets: 1,
    restSeconds: 5,
    category: 'mobility',
  },
  wallpushup: {
    id: 'wallpushup',
    name: 'Wall push-ups',
    cue: 'Hands on the wall at shoulder height, body straight from head to heels. Bend elbows to bring your chest toward the wall, then push back. Quiet, meeting-safe reps.',
    kind: 'reps',
    baseline: 15,
    sets: 2,
    restSeconds: 20,
    category: 'push',
  },
  hipcircles: {
    id: 'hipcircles',
    name: 'Standing hip circles',
    cue: 'Hands on hips, big slow circles both directions.',
    kind: 'per-side-timed',
    baseline: 20,
    sets: 1,
    restSeconds: 5,
    category: 'mobility',
  },
  neckrolls: {
    id: 'neckrolls',
    name: 'Neck rolls + chin tucks',
    cue: 'Gentle. 5 slow rolls each way, 5 chin tucks.',
    kind: 'timed',
    baseline: 45,
    sets: 1,
    restSeconds: 5,
    category: 'mobility',
  },
  breathing: {
    id: 'breathing',
    name: 'Box breathing',
    cue: 'Inhale 4, hold 4, exhale 4, hold 4. Repeat.',
    kind: 'timed',
    baseline: 60,
    sets: 1,
    restSeconds: 0,
    category: 'mobility',
  },
} as const satisfies Record<string, Exercise>

export type ExerciseId = keyof typeof EXERCISES

export const SESSIONS: Session[] = [
  {
    id: 'strength-a',
    tag: 'strength-a',
    title: 'Strength A · Push + Core',
    subtitle: 'Push-ups, crunches, plank, superman — 3 circuit rounds.',
    minutes: 12,
    exerciseIds: ['pushups', 'crunches', 'plank', 'superman'],
    meetingSafe: false,
    format: 'circuit',
  },
  {
    id: 'strength-b',
    tag: 'strength-b',
    title: 'Strength B · Legs + Posterior',
    subtitle: 'Squats, reverse lunges, glute bridges, wall sit — 3 circuit rounds.',
    minutes: 13,
    exerciseIds: ['squats', 'lunges', 'glutebridge', 'wallsit'],
    meetingSafe: false,
    format: 'circuit',
  },
  {
    id: 'mobility',
    tag: 'mobility',
    title: 'Mobility · Office Reset Yoga',
    subtitle: '~12 min of hips, spine, and hamstrings. Meeting-friendly on camera-off.',
    minutes: 12,
    exerciseIds: [
      'catcow',
      'downdog',
      'lowlunge',
      'forwardfold',
      'seatedfold',
      'cobra',
      'pigeon',
      'childs',
    ],
    meetingSafe: true,
    format: 'sequence',
  },
  {
    id: 'micro',
    tag: 'micro',
    title: 'Micro · Between Meetings',
    subtitle: '5-6 min stand-up reset. Fully meeting-safe.',
    minutes: 6,
    exerciseIds: ['shoulderrolls', 'wallpushup', 'hipcircles', 'neckrolls', 'breathing'],
    meetingSafe: true,
    format: 'sequence',
  },
]

