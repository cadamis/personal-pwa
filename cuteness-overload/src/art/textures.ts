/**
 * Every sprite in the game, drawn once at boot.
 *
 * Each painter returns a canvas whose *display* size is stated in display
 * pixels; because the canvas is {@link ART_SS}x that, sprites are shown at
 * {@link ART_SCALE}. Anything that creates a sprite should multiply its scale by
 * ART_SCALE.
 */
import type Phaser from 'phaser'
import {
  ART_SS,
  blush,
  circle,
  css,
  darken,
  ellipse,
  eyes,
  gloss,
  heart,
  lighten,
  makeCanvas,
  makeRect,
  mouth,
  P,
  rim,
  roundRect,
  seededRandom,
  sparkle,
  star,
  wrapped,
  type Canvas2D,
} from './draw'

/** Scale to display art at its intended size. */
export const ART_SCALE = 1 / ART_SS

type Painter = () => Canvas2D

// ------------------------------------------------------------------ the crew

const mochi: Painter = () => {
  const { ctx, ...rest } = makeCanvas(42)
  const cx = 21
  const cy = 23
  const fur = P.peach
  const edge = rim(fur)
  ellipse(ctx, cx + 14, cy + 1, 5.5, 4.5, P.cream, edge) // tail
  for (const side of [-1, 1]) {
    ellipse(ctx, cx + side * 9.5, cy - 11, 5, 6.8, fur, edge)
    ellipse(ctx, cx + side * 9.5, cy - 10.5, 2.4, 3.4, P.pink)
  }
  for (const side of [-1, 1]) ellipse(ctx, cx + side * 7, cy + 12, 3.8, 2.8, P.cream, edge)
  ellipse(ctx, cx, cy, 14, 12.8, fur, edge)
  ellipse(ctx, cx, cy + 4, 9.5, 7.5, P.cream)
  gloss(ctx, cx - 5.5, cy - 7, 4.2, 2.6, 0.45)
  eyes(ctx, cx, cy - 1.5, 5.6, 3.4, 'wide')
  blush(ctx, cx, cy + 3.5, 9.5, 3, 2)
  ellipse(ctx, cx, cy + 2.6, 1.7, 1.2, P.ink)
  mouth(ctx, cx, cy + 6, 3, 'cat')
  return { ctx, ...rest }
}

const nimbus: Painter = () => {
  const { ctx, ...rest } = makeCanvas(44)
  const cx = 22
  const cy = 23
  const edge = rim(P.sky)
  for (const side of [-1, 1]) {
    // cat ears, tucked behind the cloud
    ctx.beginPath()
    ctx.moveTo(cx + side * 6, cy - 9)
    ctx.lineTo(cx + side * 11.5, cy - 18)
    ctx.lineTo(cx + side * 13, cy - 7)
    ctx.closePath()
    ctx.fillStyle = css(P.cream)
    ctx.fill()
    ctx.lineWidth = 1.6
    ctx.strokeStyle = css(edge)
    ctx.stroke()
  }
  ellipse(ctx, cx + 15, cy + 3, 4.5, 3.4, P.cream, edge) // tail puff
  // cloud body: three overlapping puffs
  ellipse(ctx, cx - 8, cy + 1, 8, 7, P.cream, edge)
  ellipse(ctx, cx + 8, cy + 1, 8, 7, P.cream, edge)
  ellipse(ctx, cx, cy - 3, 11.5, 10, P.cream, edge)
  ellipse(ctx, cx, cy + 3, 12, 8, P.cream)
  ellipse(ctx, cx, cy + 7.5, 10, 4, lighten(P.sky, 0.45))
  gloss(ctx, cx - 5, cy - 8, 4, 2.4, 0.6)
  eyes(ctx, cx, cy - 2, 5.4, 3.4, 'sparkly')
  blush(ctx, cx, cy + 2.5, 9, 2.8, 1.9, P.pink)
  mouth(ctx, cx, cy + 5, 2.6, 'cat')
  return { ctx, ...rest }
}

const waffles: Painter = () => {
  const { ctx, ...rest } = makeCanvas(44)
  const cx = 22
  const cy = 24
  const spike = P.grumpBrown
  const edge = rim(spike)
  // spiky back
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.06 + (i / 8) * 0.88)
    const len = 9 + (i % 2) * 2.5
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a - 0.11) * 11, cy + Math.sin(a - 0.11) * 10)
    ctx.lineTo(cx + Math.cos(a) * (11 + len), cy + Math.sin(a) * (10 + len))
    ctx.lineTo(cx + Math.cos(a + 0.11) * 11, cy + Math.sin(a + 0.11) * 10)
    ctx.closePath()
    ctx.fillStyle = css(i % 2 ? spike : darken(spike, 0.14))
    ctx.fill()
    ctx.lineWidth = 1.2
    ctx.strokeStyle = css(edge)
    ctx.stroke()
  }
  for (const side of [-1, 1]) ellipse(ctx, cx + side * 6.5, cy + 11.5, 3.4, 2.5, P.peach, edge)
  ellipse(ctx, cx, cy + 1, 13, 11.5, P.peach, edge)
  ellipse(ctx, cx, cy + 4, 9, 7.5, P.cream)
  eyes(ctx, cx, cy - 0.5, 5.2, 3.2, 'happy')
  blush(ctx, cx, cy + 4, 8.8, 2.8, 1.9)
  ellipse(ctx, cx, cy + 3.5, 2, 1.5, P.ink)
  mouth(ctx, cx, cy + 7, 2.8, 'smile')
  return { ctx, ...rest }
}

const pip: Painter = () => {
  const { ctx, ...rest } = makeCanvas(46)
  const cx = 23
  const cy = 26
  const fur = P.lavender
  const edge = rim(fur)
  for (const side of [-1, 1]) {
    ellipse(ctx, cx + side * 6.5, cy - 15, 3.6, 11, fur, edge)
    ellipse(ctx, cx + side * 6.5, cy - 15, 1.7, 8, P.pink)
  }
  ellipse(ctx, cx - 13, cy + 4, 4.2, 4, P.cream, edge) // pom tail
  for (const side of [-1, 1]) ellipse(ctx, cx + side * 6.5, cy + 11, 3.6, 2.7, P.cream, edge)
  ellipse(ctx, cx, cy, 12.5, 11.5, fur, edge)
  ellipse(ctx, cx, cy + 3.5, 8.5, 7, P.cream)
  gloss(ctx, cx - 5, cy - 6.5, 3.8, 2.3, 0.4)
  eyes(ctx, cx, cy - 1.5, 5.2, 3.4, 'sparkly')
  blush(ctx, cx, cy + 3.5, 8.6, 2.8, 1.9)
  ellipse(ctx, cx, cy + 2.4, 1.6, 1.2, P.pinkHot)
  mouth(ctx, cx, cy + 5.5, 2.6, 'cat')
  // lucky clover tucked behind an ear
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2
    ellipse(ctx, cx + 11 + Math.cos(a) * 2.4, cy - 9 + Math.sin(a) * 2.4, 2.2, 2.2, P.teal)
  }
  return { ctx, ...rest }
}

const blobbo: Painter = () => {
  const { ctx, ...rest } = makeCanvas(44)
  const cx = 22
  const cy = 24
  const body = P.mint
  const edge = rim(body)
  ctx.beginPath()
  ctx.moveTo(cx - 14, cy + 10)
  ctx.bezierCurveTo(cx - 15, cy - 8, cx - 6, cy - 14, cx, cy - 14)
  ctx.bezierCurveTo(cx + 6, cy - 14, cx + 15, cy - 8, cx + 14, cy + 10)
  ctx.quadraticCurveTo(cx + 8, cy + 13, cx + 5, cy + 10)
  ctx.quadraticCurveTo(cx, cy + 14, cx - 5, cy + 10)
  ctx.quadraticCurveTo(cx - 8, cy + 13, cx - 14, cy + 10)
  ctx.closePath()
  ctx.fillStyle = css(body)
  ctx.fill()
  ctx.lineWidth = 1.8
  ctx.strokeStyle = css(edge)
  ctx.stroke()
  gloss(ctx, cx - 5.5, cy - 7, 4.5, 3, 0.6)
  gloss(ctx, cx + 6, cy + 3, 2.2, 1.5, 0.4)
  eyes(ctx, cx, cy - 2, 5.4, 3.6, 'sparkly')
  blush(ctx, cx, cy + 3, 9, 3, 2, P.teal)
  mouth(ctx, cx, cy + 6, 3, 'grin')
  return { ctx, ...rest }
}

// -------------------------------------------------------------------- the Grumps

const snail: Painter = () => {
  const { ctx, ...rest } = makeCanvas(34)
  const cx = 17
  const cy = 19
  const bodyColor = P.grumpGreen
  ellipse(ctx, cx - 3, cy + 5, 13, 5, bodyColor, rim(bodyColor)) // foot
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy)
    ctx.lineTo(cx - 11 + side * 1.5, cy - 8)
    ctx.lineWidth = 1.4
    ctx.strokeStyle = css(rim(bodyColor))
    ctx.stroke()
    circle(ctx, cx - 11 + side * 1.5, cy - 9, 1.5, bodyColor)
  }
  // shell spiral
  const shell = P.grumpBrown
  circle(ctx, cx + 3, cy - 2, 9.5, shell, rim(shell))
  ctx.lineWidth = 1.7
  ctx.strokeStyle = css(darken(shell, 0.22))
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(cx + 3, cy - 2, 2.4 + i * 2.6, i * 1.4, i * 1.4 + Math.PI * 1.5)
    ctx.stroke()
  }
  eyes(ctx, cx - 7, cy + 1, 2.6, 2.1, 'cross')
  mouth(ctx, cx - 7, cy + 5, 2, 'frown')
  return { ctx, ...rest }
}

const bee: Painter = () => {
  const { ctx, ...rest } = makeCanvas(28)
  const cx = 14
  const cy = 15
  ctx.save()
  ctx.globalAlpha = 0.65
  for (const side of [-1, 1]) ellipse(ctx, cx + side * 8, cy - 6, 6, 4, P.white, rim(P.sky), 1)
  ctx.restore()
  ellipse(ctx, cx, cy, 9, 8, P.lemon, rim(P.lemon))
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, 9, 8, 0, 0, Math.PI * 2)
  ctx.clip()
  for (const dx of [-3, 3]) roundRect(ctx, cx + dx - 1.2, cy - 9, 2.6, 18, 1, darken(P.gold, 0.45))
  ctx.restore()
  circle(ctx, cx, cy - 11, 1.1, P.ink)
  ctx.beginPath()
  ctx.moveTo(cx, cy - 8)
  ctx.lineTo(cx, cy - 10.5)
  ctx.lineWidth = 1
  ctx.strokeStyle = css(P.ink)
  ctx.stroke()
  eyes(ctx, cx, cy - 1, 3.2, 2.2, 'cross')
  mouth(ctx, cx, cy + 4, 1.8, 'wobble')
  return { ctx, ...rest }
}

const slime: Painter = () => {
  const { ctx, ...rest } = makeCanvas(34)
  const cx = 17
  const cy = 19
  const body = P.grumpPurple
  ctx.beginPath()
  ctx.moveTo(cx - 12, cy + 8)
  ctx.bezierCurveTo(cx - 13, cy - 6, cx - 5, cy - 12, cx, cy - 12)
  ctx.bezierCurveTo(cx + 5, cy - 12, cx + 13, cy - 6, cx + 12, cy + 8)
  ctx.quadraticCurveTo(cx, cy + 12, cx - 12, cy + 8)
  ctx.closePath()
  ctx.fillStyle = css(body)
  ctx.fill()
  ctx.lineWidth = 1.6
  ctx.strokeStyle = css(rim(body))
  ctx.stroke()
  gloss(ctx, cx - 4.5, cy - 6, 3.4, 2.2, 0.45)
  eyes(ctx, cx, cy - 1, 4.4, 2.8, 'cross')
  mouth(ctx, cx, cy + 5, 2.4, 'frown')
  return { ctx, ...rest }
}

const acorn: Painter = () => {
  const { ctx, ...rest } = makeCanvas(30)
  const cx = 15
  const cy = 17
  const nut = P.peach
  ctx.beginPath()
  ctx.moveTo(cx - 9, cy - 2)
  ctx.quadraticCurveTo(cx, cy + 13, cx + 9, cy - 2)
  ctx.closePath()
  ctx.fillStyle = css(nut)
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = css(rim(nut))
  ctx.stroke()
  const cap = P.grumpBrown
  ctx.beginPath()
  ctx.ellipse(cx, cy - 3, 10, 6.5, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fillStyle = css(cap)
  ctx.fill()
  ctx.strokeStyle = css(rim(cap))
  ctx.stroke()
  roundRect(ctx, cx - 1.2, cy - 13, 2.4, 4.5, 1.2, darken(cap, 0.3))
  eyes(ctx, cx, cy + 2, 3.4, 2.2, 'cross')
  mouth(ctx, cx, cy + 7, 1.8, 'frown')
  return { ctx, ...rest }
}

const cloudFoe: Painter = () => {
  const { ctx, ...rest } = makeCanvas(38)
  const cx = 19
  const cy = 18
  const body = P.grumpGrey
  const edge = rim(body)
  ellipse(ctx, cx - 9, cy + 2, 8, 6.5, body, edge)
  ellipse(ctx, cx + 9, cy + 2, 8, 6.5, body, edge)
  ellipse(ctx, cx, cy - 3, 11, 9, body, edge)
  ellipse(ctx, cx, cy + 3, 11.5, 7, body)
  eyes(ctx, cx, cy - 1, 5, 3, 'sleepy')
  mouth(ctx, cx, cy + 5, 2.6, 'frown')
  ellipse(ctx, cx + 6, cy + 6, 1.6, 2.4, P.blue) // a single sad tear
  return { ctx, ...rest }
}

const moth: Painter = () => {
  const { ctx, ...rest } = makeCanvas(32)
  const cx = 16
  const cy = 17
  ctx.save()
  ctx.globalAlpha = 0.8
  for (const side of [-1, 1]) {
    ellipse(ctx, cx + side * 8, cy - 3, 7.5, 8.5, P.lavender, rim(P.lavender), 1.2)
    ellipse(ctx, cx + side * 7, cy + 5, 5, 4.5, lighten(P.lavender, 0.25), rim(P.lavender), 1)
    circle(ctx, cx + side * 8.5, cy - 4, 2, P.cream)
  }
  ctx.restore()
  ellipse(ctx, cx, cy, 4.5, 8, P.grumpBrown, rim(P.grumpBrown))
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + side * 1.5, cy - 7)
    ctx.quadraticCurveTo(cx + side * 5, cy - 12, cx + side * 3, cy - 14)
    ctx.lineWidth = 1.1
    ctx.strokeStyle = css(P.ink)
    ctx.stroke()
  }
  eyes(ctx, cx, cy - 3, 2.3, 1.9, 'sleepy')
  mouth(ctx, cx, cy + 2, 1.5, 'wobble')
  return { ctx, ...rest }
}

const gnome: Painter = () => {
  const { ctx, ...rest } = makeCanvas(46)
  const cx = 23
  const cy = 27
  const coat = P.grumpRed
  ellipse(ctx, cx, cy + 4, 14, 13, coat, rim(coat)) // body
  for (const side of [-1, 1]) ellipse(ctx, cx + side * 12, cy + 6, 4, 5.5, coat, rim(coat))
  ellipse(ctx, cx, cy - 6, 11, 9.5, P.cream, rim(P.cream)) // face
  // beard
  ctx.beginPath()
  ctx.moveTo(cx - 9, cy - 4)
  ctx.quadraticCurveTo(cx, cy + 16, cx + 9, cy - 4)
  ctx.quadraticCurveTo(cx, cy + 3, cx - 9, cy - 4)
  ctx.closePath()
  ctx.fillStyle = css(P.white)
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = css(rim(P.cream))
  ctx.stroke()
  // hat
  ctx.beginPath()
  ctx.moveTo(cx - 12, cy - 11)
  ctx.quadraticCurveTo(cx - 2, cy - 34, cx + 13, cy - 12)
  ctx.closePath()
  ctx.fillStyle = css(P.pinkHot)
  ctx.fill()
  ctx.strokeStyle = css(rim(P.pinkHot))
  ctx.stroke()
  ellipse(ctx, cx, cy - 11, 13, 3.6, lighten(P.pinkHot, 0.3), rim(P.pinkHot))
  ellipse(ctx, cx, cy - 2, 3.4, 2.6, P.pinkHot) // nose
  eyes(ctx, cx, cy - 7, 5, 2.6, 'cross')
  return { ctx, ...rest }
}

const fluffington: Painter = () => {
  const { ctx, ...rest } = makeCanvas(74)
  const cx = 37
  const cy = 42
  const fur = P.grumpGrey
  const edge = rim(fur)
  // fluffy silhouette: a ring of puffs around the body
  const rnd = seededRandom(7)
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    const r = 24 + rnd() * 3
    circle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92, 7.5, fur, edge, 1.4)
  }
  ellipse(ctx, cx, cy, 26, 24, fur, edge, 1.8)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + side * 10, cy - 20)
    ctx.lineTo(cx + side * 20, cy - 34)
    ctx.lineTo(cx + side * 23, cy - 16)
    ctx.closePath()
    ctx.fillStyle = css(fur)
    ctx.fill()
    ctx.lineWidth = 1.8
    ctx.strokeStyle = css(edge)
    ctx.stroke()
    ellipse(ctx, cx + side * 17, cy - 23, 3.4, 5, P.pink)
  }
  ellipse(ctx, cx, cy + 5, 17, 13, P.cream) // muzzle
  eyes(ctx, cx, cy - 4, 10, 5.4, 'cross')
  ellipse(ctx, cx, cy + 3, 3.4, 2.4, P.pinkHot)
  mouth(ctx, cx, cy + 11, 5, 'frown')
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(cx + side * 9, cy + 6 + i * 2.5)
      ctx.lineTo(cx + side * 24, cy + 4 + i * 6)
      ctx.lineWidth = 1.2
      ctx.strokeStyle = css(P.white)
      ctx.stroke()
    }
  }
  // crown, because he is in charge
  ctx.beginPath()
  ctx.moveTo(cx - 11, cy - 26)
  ctx.lineTo(cx - 11, cy - 36)
  ctx.lineTo(cx - 5, cy - 30)
  ctx.lineTo(cx, cy - 38)
  ctx.lineTo(cx + 5, cy - 30)
  ctx.lineTo(cx + 11, cy - 36)
  ctx.lineTo(cx + 11, cy - 26)
  ctx.closePath()
  ctx.fillStyle = css(P.gold)
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = css(darken(P.gold, 0.35))
  ctx.stroke()
  return { ctx, ...rest }
}

// ------------------------------------------------------------------ projectiles

const bubble: Painter = () => {
  const { ctx, ...rest } = makeCanvas(20)
  const c = 10
  ctx.save()
  ctx.globalAlpha = 0.55
  circle(ctx, c, c, 8.5, P.sky)
  ctx.restore()
  circle(ctx, c, c, 8.5, 0xffffff, lighten(P.blue, 0.2), 1.6)
  ctx.save()
  ctx.globalAlpha = 0.35
  circle(ctx, c, c, 8.5, P.sky)
  ctx.restore()
  gloss(ctx, c - 2.8, c - 3, 2.6, 1.8, 0.9)
  return { ctx, ...rest }
}

const spike: Painter = () => {
  const { ctx, ...rest } = makeCanvas(20)
  const c = 10
  const body = P.grumpBrown
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(c + Math.cos(a) * 4, c + Math.sin(a) * 4)
    ctx.lineTo(c + Math.cos(a) * 9.5, c + Math.sin(a) * 9.5)
    ctx.lineWidth = 2.2
    ctx.strokeStyle = css(darken(body, 0.15))
    ctx.stroke()
  }
  circle(ctx, c, c, 5.5, body, rim(body))
  gloss(ctx, c - 1.6, c - 1.8, 1.6, 1.1, 0.5)
  return { ctx, ...rest }
}

const carrot: Painter = () => {
  const { ctx, ...rest } = makeCanvas(24)
  const cx = 12
  ctx.beginPath()
  ctx.moveTo(cx - 4.5, 5)
  ctx.lineTo(cx + 4.5, 5)
  ctx.lineTo(cx, 21)
  ctx.closePath()
  ctx.fillStyle = css(P.coral)
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = css(rim(P.coral))
  ctx.stroke()
  for (const side of [-1, 0.2, 1]) ellipse(ctx, cx + side * 3.6, 3.5, 2.4, 3.4, P.teal, rim(P.teal), 1.2)
  return { ctx, ...rest }
}

const kittenMissile: Painter = () => {
  const { ctx, ...rest } = makeCanvas(26)
  const cx = 13
  const cy = 14
  // flame trail points left; the sprite is rotated to face travel
  ctx.beginPath()
  ctx.moveTo(cx - 6, cy - 4)
  ctx.quadraticCurveTo(cx - 14, cy, cx - 6, cy + 4)
  ctx.closePath()
  ctx.fillStyle = css(P.gold)
  ctx.fill()
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(cx + 1, cy + side * 4)
    ctx.lineTo(cx + 3, cy + side * 10)
    ctx.lineTo(cx + 7, cy + side * 3)
    ctx.closePath()
    ctx.fillStyle = css(P.cream)
    ctx.fill()
    ctx.lineWidth = 1.3
    ctx.strokeStyle = css(rim(P.peach))
    ctx.stroke()
  }
  ellipse(ctx, cx + 3, cy, 8.5, 7.5, P.cream, rim(P.peach))
  eyes(ctx, cx + 4, cy - 1, 3.2, 2.1, 'happy')
  blush(ctx, cx + 4, cy + 2.5, 5.5, 1.8, 1.2)
  mouth(ctx, cx + 4, cy + 3.5, 1.6, 'cat')
  return { ctx, ...rest }
}

const frosting: Painter = () => {
  const { ctx, ...rest } = makeCanvas(18)
  const c = 9
  circle(ctx, c, c, 7, P.pink, rim(P.pink))
  circle(ctx, c - 1.5, c - 1.5, 3, lighten(P.pink, 0.5))
  return { ctx, ...rest }
}

const boba: Painter = () => {
  const { ctx, ...rest } = makeCanvas(20)
  const c = 10
  circle(ctx, c, c, 8, darken(P.grumpBrown, 0.45), darken(P.grumpBrown, 0.6))
  gloss(ctx, c - 2.6, c - 3, 2.4, 1.6, 0.65)
  return { ctx, ...rest }
}

const sticker: Painter = () => {
  const { ctx, ...rest } = makeCanvas(24)
  const c = 12
  star(ctx, c, c, 10.5, 5, 0.48, P.lemon, darken(P.gold, 0.3))
  star(ctx, c, c, 5.5, 5, 0.48, lighten(P.lemon, 0.5))
  return { ctx, ...rest }
}

const goose: Painter = () => {
  const { ctx, ...rest } = makeCanvas(30)
  const cx = 15
  const cy = 16
  ellipse(ctx, cx - 3, cy + 4, 10, 7.5, P.white, rim(P.grumpGrey)) // body
  ellipse(ctx, cx + 4, cy - 6, 6.5, 6, P.white, rim(P.grumpGrey)) // head
  ctx.beginPath()
  ctx.moveTo(cx + 9, cy - 8)
  ctx.lineTo(cx + 15, cy - 6)
  ctx.lineTo(cx + 9, cy - 3.5)
  ctx.closePath()
  ctx.fillStyle = css(P.gold)
  ctx.fill()
  ctx.lineWidth = 1.3
  ctx.strokeStyle = css(darken(P.gold, 0.35))
  ctx.stroke()
  eyes(ctx, cx + 4, cy - 7, 2.6, 1.8, 'cross')
  return { ctx, ...rest }
}

const cone: Painter = () => {
  const { ctx, ...rest } = makeCanvas(24)
  const cx = 12
  ctx.beginPath()
  ctx.moveTo(cx - 6, 11)
  ctx.lineTo(cx + 6, 11)
  ctx.lineTo(cx, 22)
  ctx.closePath()
  ctx.fillStyle = css(P.peach)
  ctx.fill()
  ctx.lineWidth = 1.4
  ctx.strokeStyle = css(rim(P.peach))
  ctx.stroke()
  circle(ctx, cx - 2.5, 8, 5, P.pink, rim(P.pink))
  circle(ctx, cx + 3, 7.5, 4.6, P.mint, rim(P.mint))
  circle(ctx, cx, 3.6, 4.2, P.lemon, rim(P.lemon))
  return { ctx, ...rest }
}

const raindrop: Painter = () => {
  const { ctx, ...rest } = makeCanvas(16)
  const cx = 8
  ctx.beginPath()
  ctx.moveTo(cx, 1.5)
  ctx.bezierCurveTo(cx + 6.5, 8, cx + 5, 14, cx, 14)
  ctx.bezierCurveTo(cx - 5, 14, cx - 6.5, 8, cx, 1.5)
  ctx.closePath()
  ctx.fillStyle = css(P.blue)
  ctx.fill()
  ctx.lineWidth = 1.3
  ctx.strokeStyle = css(darken(P.blue, 0.3))
  ctx.stroke()
  gloss(ctx, cx - 1.6, 9, 1.4, 2.2, 0.6)
  return { ctx, ...rest }
}

const cupcake: Painter = () => {
  const { ctx, ...rest } = makeCanvas(30)
  const cx = 15
  const cy = 17
  ctx.beginPath()
  ctx.moveTo(cx - 9, cy)
  ctx.lineTo(cx + 9, cy)
  ctx.lineTo(cx + 6.5, cy + 11)
  ctx.lineTo(cx - 6.5, cy + 11)
  ctx.closePath()
  ctx.fillStyle = css(P.peach)
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = css(rim(P.peach))
  ctx.stroke()
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(cx + i * 3.4, cy + 0.5)
    ctx.lineTo(cx + i * 2.6, cy + 10.5)
    ctx.lineWidth = 1.1
    ctx.strokeStyle = css(darken(P.peach, 0.25))
    ctx.stroke()
  }
  circle(ctx, cx - 4.5, cy - 3, 6, P.pink, rim(P.pink))
  circle(ctx, cx + 4.5, cy - 3, 6, P.pink, rim(P.pink))
  circle(ctx, cx, cy - 7.5, 6.5, lighten(P.pink, 0.2), rim(P.pink))
  heart(ctx, cx, cy - 12, 3, P.pinkHot)
  eyes(ctx, cx, cy + 3, 3.6, 2.2, 'happy')
  blush(ctx, cx, cy + 6, 6, 2, 1.4)
  return { ctx, ...rest }
}

// ------------------------------------------------------------------------- fx

const swipe: Painter = () => {
  const { ctx, ...rest } = makeCanvas(56)
  const cx = 28
  const cy = 28
  // Crescent opening to the right (+x); rotated in game to face the swipe.
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, 26, -Math.PI * 0.45, Math.PI * 0.45)
  ctx.arc(cx, cy, 14, Math.PI * 0.45, -Math.PI * 0.45, true)
  ctx.closePath()
  const grad = ctx.createLinearGradient(cx, cy, cx + 26, cy)
  grad.addColorStop(0, css(P.white, 0.15))
  grad.addColorStop(0.6, css(P.lemon, 0.85))
  grad.addColorStop(1, css(P.white, 0.95))
  ctx.fillStyle = grad
  ctx.fill()
  ctx.restore()
  for (const [sx, sy, sr] of [
    [24, 6, 4],
    [26, 48, 3.4],
    [40, 16, 3],
    [42, 40, 2.6],
  ]) {
    sparkle(ctx, sx, sy, sr, P.white, 0.9)
  }
  return { ctx, ...rest }
}

const nova: Painter = () => {
  const { ctx, ...rest } = makeCanvas(72)
  const c = 36
  const grad = ctx.createRadialGradient(c, c, 8, c, c, 34)
  grad.addColorStop(0, css(P.white, 0))
  grad.addColorStop(0.55, css(P.pink, 0.35))
  grad.addColorStop(0.85, css(P.lemon, 0.85))
  grad.addColorStop(1, css(P.white, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(c, c, 34, 0, Math.PI * 2)
  ctx.fill()
  const rnd = seededRandom(11)
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2
    const r = 20 + rnd() * 13
    sparkle(ctx, c + Math.cos(a) * r, c + Math.sin(a) * r, 2.2 + rnd() * 2.4, P.white, 0.9)
  }
  return { ctx, ...rest }
}

const beam: Painter = () => {
  const { ctx, ...rest } = makeRect(240, 22)
  const grad = ctx.createLinearGradient(0, 0, 0, 22)
  const bands = [P.pinkHot, P.gold, P.lemon, P.mint, P.sky, P.purple]
  bands.forEach((color, i) => grad.addColorStop(i / (bands.length - 1), css(color, 0.95)))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(0, 1, 240, 20, 10)
  ctx.fill()
  ctx.save()
  ctx.globalAlpha = 0.5
  roundRect(ctx, 6, 7, 228, 4, 2, P.white)
  ctx.restore()
  return { ctx, ...rest }
}

const puff: Painter = () => {
  const { ctx, ...rest } = makeCanvas(18)
  const c = 9
  const grad = ctx.createRadialGradient(c, c, 0, c, c, 9)
  grad.addColorStop(0, css(P.white, 0.95))
  grad.addColorStop(0.6, css(P.pink, 0.6))
  grad.addColorStop(1, css(P.pink, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(c, c, 9, 0, Math.PI * 2)
  ctx.fill()
  return { ctx, ...rest }
}

const starDust: Painter = () => {
  const { ctx, ...rest } = makeCanvas(16)
  sparkle(ctx, 8, 8, 7.5, P.lemon, 1)
  sparkle(ctx, 8, 8, 3.6, P.white, 1)
  return { ctx, ...rest }
}

// -------------------------------------------------------------------- pickups

const heartPickup: Painter = () => {
  const { ctx, ...rest } = makeCanvas(18)
  heart(ctx, 9, 10, 7, P.pinkHot, darken(P.pinkHot, 0.35))
  gloss(ctx, 6.2, 6.5, 1.8, 1.2, 0.8)
  return { ctx, ...rest }
}

const sprinklePickup: Painter = () => {
  const { ctx, ...rest } = makeCanvas(16)
  ctx.save()
  ctx.translate(8, 8)
  ctx.rotate(-0.5)
  roundRect(ctx, -6, -2.6, 12, 5.2, 2.6, P.gold, darken(P.gold, 0.4))
  ctx.restore()
  ctx.save()
  ctx.globalAlpha = 0.85
  roundRect(ctx, 1.5, 1.5, 4.5, 2.4, 1.2, P.white)
  ctx.restore()
  return { ctx, ...rest }
}

const snackPickup: Painter = () => {
  const { ctx, ...rest } = makeCanvas(20)
  const c = 10
  circle(ctx, c, c, 8, P.grumpBrown, darken(P.grumpBrown, 0.35))
  for (const [dx, dy] of [
    [-3, -2],
    [2, -3],
    [3.5, 2],
    [-2, 3],
    [0, 0.5],
  ]) {
    circle(ctx, c + dx, c + dy, 1.7, darken(P.grumpBrown, 0.55))
  }
  return { ctx, ...rest }
}

// ------------------------------------------------------------------ backdrop

/**
 * The meadow.
 *
 * Deliberately almost featureless: a few enormous, very low-contrast soft
 * patches and nothing else. Anything small — tufts, flowers, a checker — reads
 * as visual noise once a hundred Grumps and several hundred projectiles are
 * moving over it, and the sprites are what the player needs to see. The patches
 * are big enough that at most one or two are on screen at a time, so they give
 * a sense of movement without ever competing for attention.
 */
const meadow: Painter = () => {
  const size = 256
  const { ctx, ...rest } = makeCanvas(size)
  ctx.fillStyle = css(P.grass)
  ctx.fillRect(0, 0, size, size)

  /** A soft-edged blob, drawn nine times so it wraps across the tile seams. */
  const patch = (x: number, y: number, radius: number, color: number, alpha: number): void => {
    wrapped(ctx, size, () => {
      const grad = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius)
      grad.addColorStop(0, css(color, alpha))
      grad.addColorStop(0.65, css(color, alpha * 0.7))
      grad.addColorStop(1, css(color, 0))
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(x, y, radius, radius * 0.8, 0, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // Three darker hollows and two lighter rises, all far bigger than any sprite.
  patch(size * 0.22, size * 0.3, size * 0.42, P.grassDark, 0.5)
  patch(size * 0.78, size * 0.68, size * 0.38, P.grassDark, 0.45)
  patch(size * 0.55, size * 0.08, size * 0.3, P.grassDarker, 0.3)
  patch(size * 0.85, size * 0.22, size * 0.3, lighten(P.grass, 0.4), 0.4)
  patch(size * 0.3, size * 0.85, size * 0.34, lighten(P.grass, 0.4), 0.35)

  return { ctx, ...rest }
}

// -------------------------------------------------------------------------- ui

const stickBase: Painter = () => {
  const { ctx, ...rest } = makeCanvas(130)
  const c = 65
  ctx.save()
  ctx.globalAlpha = 0.16
  circle(ctx, c, c, 60, P.white)
  ctx.restore()
  ctx.lineWidth = 4
  ctx.strokeStyle = css(P.white, 0.5)
  ctx.beginPath()
  ctx.arc(c, c, 60, 0, Math.PI * 2)
  ctx.stroke()
  ctx.save()
  ctx.globalAlpha = 0.4
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    sparkle(ctx, c + Math.cos(a) * 60, c + Math.sin(a) * 60, 7, P.white, 0.7)
  }
  ctx.restore()
  return { ctx, ...rest }
}

/** Chevron for the off-screen boss pointer. Points along +x; rotated in use. */
const pointer: Painter = () => {
  const { ctx, ...rest } = makeCanvas(22)
  ctx.beginPath()
  ctx.moveTo(2.5, 2)
  ctx.lineTo(20, 11)
  ctx.lineTo(2.5, 20)
  ctx.quadraticCurveTo(7, 11, 2.5, 2)
  ctx.closePath()
  ctx.fillStyle = css(P.gold)
  ctx.fill()
  // Thin: a heavy outline on a 22px shape swallows the gold entirely.
  ctx.lineWidth = 1.4
  ctx.strokeStyle = css(P.night)
  ctx.stroke()
  return { ctx, ...rest }
}

const stickKnob: Painter = () => {
  const { ctx, ...rest } = makeCanvas(64)
  const c = 32
  ctx.save()
  ctx.globalAlpha = 0.9
  circle(ctx, c, c, 26, P.pink, P.white, 3)
  ctx.restore()
  gloss(ctx, c - 8, c - 9, 8, 5, 0.65)
  heart(ctx, c, c + 3, 9, P.pinkHot)
  return { ctx, ...rest }
}

// --------------------------------------------------------------------- registry

/**
 * Every sprite, by texture key. Exported so tooling (and the art preview page)
 * can render one sprite without booting a whole Phaser game.
 */
export const PAINTERS: Readonly<Record<string, Painter>> = {
  'char-mochi': mochi,
  'char-nimbus': nimbus,
  'char-waffles': waffles,
  'char-pip': pip,
  'char-blobbo': blobbo,

  'foe-snail': snail,
  'foe-bee': bee,
  'foe-slime': slime,
  'foe-acorn': acorn,
  'foe-cloud': cloudFoe,
  'foe-moth': moth,
  'foe-gnome': gnome,
  'foe-fluffington': fluffington,

  'proj-bubble': bubble,
  'proj-spike': spike,
  'proj-carrot': carrot,
  'proj-kitten': kittenMissile,
  'proj-frosting': frosting,
  'proj-boba': boba,
  'proj-sticker': sticker,
  'proj-goose': goose,
  'proj-cone': cone,
  'proj-raindrop': raindrop,
  'prop-cupcake': cupcake,

  'fx-swipe': swipe,
  'fx-nova': nova,
  'fx-beam': beam,
  'fx-puff': puff,
  'fx-star': starDust,

  'pick-heart': heartPickup,
  'pick-sprinkle': sprinklePickup,
  'pick-snack': snackPickup,

  'bg-meadow': meadow,

  'ui-stick-base': stickBase,
  'ui-stick-knob': stickKnob,
  'ui-pointer': pointer,
}

/** Draws every sprite into the texture manager. Safe to call more than once. */
export function buildTextures(textures: Phaser.Textures.TextureManager): void {
  for (const [key, paint] of Object.entries(PAINTERS)) {
    if (textures.exists(key)) continue
    textures.addCanvas(key, paint().canvas)
  }
}
