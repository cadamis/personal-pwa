import { CANVAS_W, CANVAS_H, TABLE_POSITIONS } from './constants.js'

// ─── Color palette ─────────────────────────────────────────────────────────────
const C = {
  floorLight:  '#f0e8d8',
  floorDark:   '#e8dcc8',
  floorLine:   '#d4c4a8',
  wall:        '#8b6914',
  wallDark:    '#6b4c2a',
  counter:     '#5c3d1e',
  counterTop:  '#7a5230',
  counterFront:'#4a2e0e',
  tableSurface:'#8b5e3c',
  tableEdge:   '#6b4420',
  chairFill:   '#a0734a',
  chairStroke: '#7a5230',
  plant:       '#4a6741',
  plantPot:    '#c4693b',
  door:        '#4a2e0e',
  doorFrame:   '#6b4c2a',
  windowFrame: '#8b6914',
  windowGlass: 'rgba(180,220,255,0.25)',
  rug:         '#b8603a',
  rugBorder:   '#8b3a1e',
  mood_happy:   '#ffdd57',
  mood_neutral: '#ffffff',
  mood_unhappy: '#ff6b6b',
  mood_impatient: '#ff9a3c',
  speechBg:    'rgba(255,252,240,0.95)',
  speechBorder:'#8b6914',
}

// ─── Background / environment ─────────────────────────────────────────────────

function drawFloor(ctx) {
  // Base floor
  ctx.fillStyle = C.floorLight
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Wood-plank lines (horizontal)
  ctx.strokeStyle = C.floorLine
  ctx.lineWidth = 1
  for (let y = 0; y < CANVAS_H; y += 28) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS_W, y)
    ctx.stroke()
  }
  // Subtle vertical dividers every 120px, staggered
  ctx.strokeStyle = C.floorDark
  ctx.lineWidth = 0.5
  for (let row = 0; row * 28 < CANVAS_H; row++) {
    const offset = (row % 2) * 60
    for (let x = offset; x < CANVAS_W; x += 120) {
      ctx.beginPath()
      ctx.moveTo(x, row * 28)
      ctx.lineTo(x, (row + 1) * 28)
      ctx.stroke()
    }
  }
}

function drawWalls(ctx) {
  // Top wall (darker wainscoting)
  ctx.fillStyle = C.wallDark
  ctx.fillRect(0, 0, CANVAS_W, 12)

  // Side walls
  ctx.fillStyle = C.wall
  ctx.fillRect(0, 12, 12, CANVAS_H - 12)
  ctx.fillRect(CANVAS_W - 12, 12, 12, CANVAS_H - 12)

  // Bottom wall with door gap
  const doorW = 60
  const doorLeft = CANVAS_W / 2 - doorW / 2
  const doorRight = CANVAS_W / 2 + doorW / 2
  ctx.fillStyle = C.wallDark
  ctx.fillRect(0, CANVAS_H - 18, doorLeft - 4, 18)
  ctx.fillRect(doorRight + 4, CANVAS_H - 18, CANVAS_W - doorRight - 4, 18)

  // Door frame
  ctx.fillStyle = C.doorFrame
  ctx.fillRect(doorLeft - 6, CANVAS_H - 22, 6, 22)
  ctx.fillRect(doorRight, CANVAS_H - 22, 6, 22)

  // Door
  ctx.fillStyle = C.door
  ctx.fillRect(doorLeft, CANVAS_H - 18, doorW, 18)
  // Door detail
  ctx.strokeStyle = C.counterTop
  ctx.lineWidth = 1
  ctx.strokeRect(doorLeft + 4, CANVAS_H - 14, doorW / 2 - 6, 10)
  ctx.strokeRect(doorLeft + doorW / 2 + 2, CANVAS_H - 14, doorW / 2 - 6, 10)
}

function drawWindows(ctx) {
  // Left window
  const wx1 = 30, wy = 14, ww = 100, wh = 60
  ctx.fillStyle = C.windowFrame
  ctx.fillRect(wx1, wy, ww, wh)
  ctx.fillStyle = C.windowGlass
  ctx.fillRect(wx1 + 4, wy + 4, ww - 8, wh - 8)
  // Window panes cross
  ctx.strokeStyle = C.windowFrame
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(wx1 + ww / 2, wy + 4)
  ctx.lineTo(wx1 + ww / 2, wy + wh - 4)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(wx1 + 4, wy + wh / 2)
  ctx.lineTo(wx1 + ww - 4, wy + wh / 2)
  ctx.stroke()

  // Right window
  const wx2 = CANVAS_W - 130
  ctx.fillStyle = C.windowFrame
  ctx.fillRect(wx2, wy, ww, wh)
  ctx.fillStyle = C.windowGlass
  ctx.fillRect(wx2 + 4, wy + 4, ww - 8, wh - 8)
  ctx.strokeStyle = C.windowFrame
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(wx2 + ww / 2, wy + 4)
  ctx.lineTo(wx2 + ww / 2, wy + wh - 4)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(wx2 + 4, wy + wh / 2)
  ctx.lineTo(wx2 + ww - 4, wy + wh / 2)
  ctx.stroke()
}

function drawPlant(ctx, x, y) {
  // Pot
  ctx.fillStyle = C.plantPot
  ctx.beginPath()
  ctx.moveTo(x - 12, y)
  ctx.lineTo(x + 12, y)
  ctx.lineTo(x + 9, y + 18)
  ctx.lineTo(x - 9, y + 18)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#9a4820'
  ctx.lineWidth = 1
  ctx.stroke()

  // Foliage
  ctx.fillStyle = C.plant
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
    const r = 14 + Math.sin(i * 1.3) * 4
    ctx.beginPath()
    ctx.arc(x + Math.cos(angle) * 6, y - 10 + Math.sin(angle) * 6, r * 0.55, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#3d5a35'
  ctx.beginPath()
  ctx.arc(x, y - 8, 10, 0, Math.PI * 2)
  ctx.fill()
}

function drawCounter(ctx) {
  const cw = CANVAS_W - 40
  const ch = 55
  const cx = 20
  const cy = 80

  // Counter surface (top-down perspective shadow)
  ctx.fillStyle = C.counterFront
  ctx.fillRect(cx, cy + ch - 6, cw, 8)

  // Counter body
  ctx.fillStyle = C.counter
  ctx.fillRect(cx, cy, cw, ch - 6)

  // Counter top highlight
  ctx.fillStyle = C.counterTop
  ctx.fillRect(cx, cy, cw, 10)

  // Wood grain on counter
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i < 8; i++) {
    const gx = cx + 20 + i * (cw / 8)
    ctx.beginPath()
    ctx.moveTo(gx, cy + 2)
    ctx.lineTo(gx + 5, cy + ch - 8)
    ctx.stroke()
  }

  // Teapot icon on counter (decorative)
  ctx.fillStyle = '#c4693b'
  ctx.beginPath()
  ctx.arc(cx + cw / 2, cy + ch / 2 - 2, 12, 0, Math.PI * 2)
  ctx.fill()
  // spout
  ctx.beginPath()
  ctx.moveTo(cx + cw / 2 + 12, cy + ch / 2 - 4)
  ctx.quadraticCurveTo(cx + cw / 2 + 22, cy + ch / 2 - 12, cx + cw / 2 + 24, cy + ch / 2 - 2)
  ctx.strokeStyle = '#c4693b'
  ctx.lineWidth = 3
  ctx.stroke()
  // handle
  ctx.beginPath()
  ctx.arc(cx + cw / 2 - 16, cy + ch / 2 - 2, 8, -Math.PI * 0.6, Math.PI * 0.6)
  ctx.strokeStyle = '#c4693b'
  ctx.lineWidth = 3
  ctx.stroke()

  // Price board above counter
  ctx.fillStyle = '#3a2208'
  ctx.fillRect(cx + cw / 2 - 100, cy - 48, 200, 40)
  ctx.strokeStyle = '#c4a45a'
  ctx.lineWidth = 2
  ctx.strokeRect(cx + cw / 2 - 100, cy - 48, 200, 40)
  ctx.fillStyle = '#f5e6b0'
  ctx.font = 'italic 13px "Playfair Display", serif'
  ctx.textAlign = 'center'
  ctx.fillText('~ Teabug Tea Room ~', cx + cw / 2, cy - 24)
  ctx.font = '10px Lato, sans-serif'
  ctx.fillStyle = '#d4c48a'
  ctx.fillText('Est. mmxxv', cx + cw / 2, cy - 12)
  ctx.textAlign = 'left'
}

function drawRug(ctx) {
  // Decorative rug in center
  const rx = 200, ry = 225, rw = 400, rh = 160
  ctx.fillStyle = C.rug
  ctx.fillRect(rx, ry, rw, rh)
  ctx.strokeStyle = C.rugBorder
  ctx.lineWidth = 3
  ctx.strokeRect(rx, ry, rw, rh)
  ctx.strokeStyle = 'rgba(255,200,150,0.3)'
  ctx.lineWidth = 1
  ctx.strokeRect(rx + 8, ry + 8, rw - 16, rh - 16)
  // Simple pattern
  ctx.strokeStyle = 'rgba(255,220,180,0.2)'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(rx + i * (rw / 4), ry + 8)
    ctx.lineTo(rx + i * (rw / 4), ry + rh - 8)
    ctx.stroke()
  }
}

function drawTable(ctx, x, y, occupied) {
  const tw = 58, th = 44, r = 8
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.beginPath()
  ctx.roundRect(x - tw / 2 + 4, y - th / 2 + 4, tw, th, r)
  ctx.fill()

  // Table surface
  ctx.fillStyle = C.tableSurface
  ctx.beginPath()
  ctx.roundRect(x - tw / 2, y - th / 2, tw, th, r)
  ctx.fill()

  // Table edge
  ctx.strokeStyle = C.tableEdge
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x - tw / 2, y - th / 2, tw, th, r)
  ctx.stroke()

  // Wood grain
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x - tw / 2 + 10, y - th / 2 + 2)
  ctx.lineTo(x - tw / 2 + 14, y + th / 2 - 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - tw / 2 + 24, y - th / 2 + 2)
  ctx.lineTo(x - tw / 2 + 28, y + th / 2 - 2)
  ctx.stroke()

  // Teacup if occupied
  if (occupied) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Chairs (top and bottom)
  const chairW = 20, chairH = 12
  const chairs = [
    { cx: x, cy: y - th / 2 - 14 },
    { cx: x, cy: y + th / 2 + 14 },
    { cx: x - tw / 2 - 14, cy: y },
    { cx: x + tw / 2 + 14, cy: y },
  ]
  chairs.forEach(({ cx: ccx, cy: ccy }) => {
    ctx.fillStyle = C.chairFill
    ctx.beginPath()
    ctx.roundRect(ccx - chairW / 2, ccy - chairH / 2, chairW, chairH, 4)
    ctx.fill()
    ctx.strokeStyle = C.chairStroke
    ctx.lineWidth = 1
    ctx.stroke()
  })
}

function drawTables(ctx, tableOccupancy) {
  TABLE_POSITIONS.forEach(table => {
    drawTable(ctx, table.x, table.y, !!tableOccupancy[table.id])
  })
}

// ─── Animal sprite drawing functions ─────────────────────────────────────────

function drawFrog(ctx, x, y) {
  // Body
  ctx.fillStyle = '#5cb85c'
  ctx.beginPath()
  ctx.ellipse(x, y + 3, 13, 12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#3d8b3d'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Belly highlight
  ctx.fillStyle = '#a8e6a8'
  ctx.beginPath()
  ctx.ellipse(x, y + 6, 7, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Eye bulges (poke above body)
  const eyeY = y - 7
  ;[x - 8, x + 8].forEach(ex => {
    ctx.fillStyle = '#5cb85c'
    ctx.beginPath()
    ctx.arc(ex, eyeY, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#3d8b3d'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // white
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(ex, eyeY, 5, 0, Math.PI * 2)
    ctx.fill()
    // pupil
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.arc(ex + 1, eyeY + 1, 2.5, 0, Math.PI * 2)
    ctx.fill()
    // shine
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(ex + 2, eyeY, 1, 0, Math.PI * 2)
    ctx.fill()
  })

  // Smile
  ctx.strokeStyle = '#2d6e2d'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y + 4, 6, 0.15, Math.PI - 0.15)
  ctx.stroke()

  // Nostrils
  ctx.fillStyle = '#3d8b3d'
  ;[x - 3, x + 3].forEach(nx => {
    ctx.beginPath()
    ctx.arc(nx, y - 1, 1, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawBoxElderBug(ctx, x, y) {
  // Body (dark oval)
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.ellipse(x, y + 2, 11, 14, 0, 0, Math.PI * 2)
  ctx.fill()

  // Red pronotum (shoulder shield)
  ctx.fillStyle = '#d32f2f'
  ctx.beginPath()
  ctx.ellipse(x, y - 5, 9, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Red wing stripes
  ctx.fillStyle = '#e53935'
  ctx.beginPath()
  ctx.moveTo(x - 7, y)
  ctx.lineTo(x - 3, y)
  ctx.lineTo(x - 2, y + 12)
  ctx.lineTo(x - 7, y + 10)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + 7, y)
  ctx.lineTo(x + 3, y)
  ctx.lineTo(x + 2, y + 12)
  ctx.lineTo(x + 7, y + 10)
  ctx.closePath()
  ctx.fill()

  // Center line
  ctx.strokeStyle = '#e53935'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y - 2)
  ctx.lineTo(x, y + 13)
  ctx.stroke()

  // Head
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.ellipse(x, y - 11, 6, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#d32f2f'
  ;[x - 4, x + 4].forEach(ex => {
    ctx.beginPath()
    ctx.arc(ex, y - 12, 2, 0, Math.PI * 2)
    ctx.fill()
  })

  // Antennae
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x - 3, y - 15); ctx.lineTo(x - 8, y - 26); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 3, y - 15); ctx.lineTo(x + 8, y - 26); ctx.stroke()
}

function drawSnake(ctx, x, y) {
  // Coiled body base
  ctx.fillStyle = '#6aaa6a'
  ctx.beginPath()
  ctx.ellipse(x, y + 3, 13, 11, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#4a8a4a'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Scale pattern (rows of small arcs)
  ctx.strokeStyle = 'rgba(50,100,50,0.4)'
  ctx.lineWidth = 0.8
  for (let row = 0; row < 3; row++) {
    for (let col = -2; col <= 2; col++) {
      const sx = x + col * 5 + (row % 2) * 2.5
      const sy = y - 2 + row * 5
      ctx.beginPath()
      ctx.arc(sx, sy, 2.5, 0, Math.PI)
      ctx.stroke()
    }
  }

  // Head
  ctx.fillStyle = '#5a9a5a'
  ctx.beginPath()
  ctx.ellipse(x + 8, y - 8, 8, 6, Math.PI * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#3a7a3a'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Eye
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(x + 12, y - 10, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.ellipse(x + 12, y - 10, 1, 2.5, Math.PI * 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.beginPath()
  ctx.arc(x + 13, y - 11, 0.8, 0, Math.PI * 2)
  ctx.fill()

  // Forked tongue
  ctx.strokeStyle = '#e53935'
  ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(x + 16, y - 8); ctx.lineTo(x + 21, y - 8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 21, y - 8); ctx.lineTo(x + 24, y - 6); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 21, y - 8); ctx.lineTo(x + 24, y - 10); ctx.stroke()
}

function drawLadybug(ctx, x, y) {
  // Body (red dome)
  ctx.fillStyle = '#e53935'
  ctx.beginPath()
  ctx.arc(x, y + 3, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#b71c1c'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Center line
  ctx.strokeStyle = '#b71c1c'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, y - 10)
  ctx.lineTo(x, y + 16)
  ctx.stroke()

  // Black spots (3 pairs)
  ctx.fillStyle = '#1a1a1a'
  const spots = [[-6, -1], [6, -1], [-5, 6], [5, 6], [-6, -7], [6, -7]]
  spots.forEach(([dx, dy]) => {
    ctx.beginPath()
    ctx.arc(x + dx, y + dy + 3, 2.5, 0, Math.PI * 2)
    ctx.fill()
  })

  // Head
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.arc(x, y - 11, 6, 0, Math.PI * 2)
  ctx.fill()

  // White eye dots on head
  ctx.fillStyle = '#fff'
  ;[x - 3, x + 3].forEach(ex => {
    ctx.beginPath()
    ctx.arc(ex, y - 12, 1.8, 0, Math.PI * 2)
    ctx.fill()
  })

  // Antennae
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x - 3, y - 16); ctx.lineTo(x - 7, y - 24); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 3, y - 16); ctx.lineTo(x + 7, y - 24); ctx.stroke()
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath(); ctx.arc(x - 7, y - 24, 1.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 7, y - 24, 1.5, 0, Math.PI * 2); ctx.fill()
}

function drawAnt(ctx, x, y) {
  const segColor = '#3e2723'
  const strokeCol = '#1a0a00'

  // Abdomen (big lower segment)
  ctx.fillStyle = segColor
  ctx.beginPath()
  ctx.ellipse(x, y + 8, 8, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = strokeCol
  ctx.lineWidth = 1
  ctx.stroke()

  // Thorax (middle, narrow)
  ctx.fillStyle = segColor
  ctx.beginPath()
  ctx.ellipse(x, y - 2, 5, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = strokeCol
  ctx.lineWidth = 1
  ctx.stroke()

  // Head
  ctx.fillStyle = segColor
  ctx.beginPath()
  ctx.arc(x, y - 12, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = strokeCol
  ctx.lineWidth = 1
  ctx.stroke()

  // Eyes
  ctx.fillStyle = '#fff'
  ;[x - 4, x + 4].forEach(ex => {
    ctx.beginPath()
    ctx.arc(ex, y - 13, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(ex, y - 13, 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
  })

  // Antennae (bent)
  ctx.strokeStyle = strokeCol
  ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(x - 3, y - 17); ctx.lineTo(x - 10, y - 24); ctx.lineTo(x - 7, y - 28); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 3, y - 17); ctx.lineTo(x + 10, y - 24); ctx.lineTo(x + 7, y - 28); ctx.stroke()

  // 6 legs from thorax (3 per side, bent at knee)
  ctx.strokeStyle = strokeCol
  ctx.lineWidth = 1
  const legAngles = [-0.4, 0, 0.4]
  legAngles.forEach((a, i) => {
    // Left legs
    const lx1 = x - 5
    const ly1 = y - 4 + i * 4
    ctx.beginPath()
    ctx.moveTo(lx1, ly1)
    ctx.lineTo(lx1 - 9, ly1 - 4 + a * 8)
    ctx.lineTo(lx1 - 15, ly1 + 4 + a * 4)
    ctx.stroke()
    // Right legs
    const rx1 = x + 5
    ctx.beginPath()
    ctx.moveTo(rx1, ly1)
    ctx.lineTo(rx1 + 9, ly1 - 4 + a * 8)
    ctx.lineTo(rx1 + 15, ly1 + 4 + a * 4)
    ctx.stroke()
  })
}

function drawButterfly(ctx, x, y) {
  // Upper wings
  ctx.fillStyle = '#ce93d8'
  ;[[x - 16, y - 6], [x + 16, y - 6]].forEach(([wx, wy], i) => {
    ctx.beginPath()
    if (i === 0) {
      ctx.ellipse(wx + 3, wy, 13, 10, -Math.PI * 0.25, 0, Math.PI * 2)
    } else {
      ctx.ellipse(wx - 3, wy, 13, 10, Math.PI * 0.25, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.strokeStyle = '#9c27b0'
    ctx.lineWidth = 1
    ctx.stroke()
  })

  // Wing pattern circles
  ctx.fillStyle = 'rgba(255,220,100,0.7)'
  ctx.beginPath(); ctx.arc(x - 14, y - 5, 4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 14, y - 5, 4, 0, Math.PI * 2); ctx.fill()

  // Lower wings (smaller)
  ctx.fillStyle = '#f48fb1'
  ;[[x - 10, y + 8], [x + 10, y + 8]].forEach(([wx, wy], i) => {
    ctx.beginPath()
    if (i === 0) {
      ctx.ellipse(wx + 2, wy, 9, 7, Math.PI * 0.3, 0, Math.PI * 2)
    } else {
      ctx.ellipse(wx - 2, wy, 9, 7, -Math.PI * 0.3, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.strokeStyle = '#e91e63'
    ctx.lineWidth = 1
    ctx.stroke()
  })

  // Body
  ctx.fillStyle = '#4a1a6a'
  ctx.beginPath()
  ctx.ellipse(x, y, 3, 12, 0, 0, Math.PI * 2)
  ctx.fill()

  // Head
  ctx.fillStyle = '#4a1a6a'
  ctx.beginPath()
  ctx.arc(x, y - 14, 4, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(x - 2, y - 15, 1.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 2, y - 15, 1.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#000'
  ctx.beginPath(); ctx.arc(x - 2, y - 15, 0.7, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 2, y - 15, 0.7, 0, Math.PI * 2); ctx.fill()

  // Antennae with knobs
  ctx.strokeStyle = '#4a1a6a'
  ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(x - 2, y - 18); ctx.lineTo(x - 9, y - 27); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 2, y - 18); ctx.lineTo(x + 9, y - 27); ctx.stroke()
  ctx.fillStyle = '#ce93d8'
  ctx.beginPath(); ctx.arc(x - 9, y - 27, 2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 9, y - 27, 2, 0, Math.PI * 2); ctx.fill()
}

function drawSpider(ctx, x, y) {
  // 8 legs radiating outward (4 per side), drawn behind body
  ctx.strokeStyle = '#263238'
  ctx.lineWidth = 1.5
  const legPairs = [
    { ox: -6, oy: -4, m1x: -18, m1y: -14, m2x: -22, m2y: -6  },
    { ox: -7, oy:  0, m1x: -20, m1y:  -2, m2x: -24, m2y:  6  },
    { ox: -7, oy:  5, m1x: -18, m1y:   8, m2x: -20, m2y:  16 },
    { ox: -5, oy:  9, m1x: -12, m1y:  18, m2x: -14, m2y:  26 },
  ]
  legPairs.forEach(({ ox, oy, m1x, m1y, m2x, m2y }) => {
    // Left leg
    ctx.beginPath()
    ctx.moveTo(x + ox, y + oy)
    ctx.lineTo(x + m1x, y + m1y)
    ctx.lineTo(x + m2x, y + m2y)
    ctx.stroke()
    // Right leg (mirror x offsets)
    ctx.beginPath()
    ctx.moveTo(x - ox, y + oy)
    ctx.lineTo(x - m1x, y + m1y)
    ctx.lineTo(x - m2x, y + m2y)
    ctx.stroke()
  })

  // Abdomen
  ctx.fillStyle = '#37474f'
  ctx.beginPath()
  ctx.ellipse(x, y + 5, 11, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#263238'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Abdomen pattern (hourglass/stripe)
  ctx.fillStyle = '#ff5722'
  ctx.beginPath()
  ctx.moveTo(x, y - 2)
  ctx.lineTo(x + 4, y + 4)
  ctx.lineTo(x, y + 8)
  ctx.lineTo(x - 4, y + 4)
  ctx.closePath()
  ctx.fill()

  // Cephalothorax (head+thorax)
  ctx.fillStyle = '#455a64'
  ctx.beginPath()
  ctx.arc(x, y - 9, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#263238'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 8 eyes (two rows of 4) on cephalothorax
  ctx.fillStyle = '#fff'
  const eyePositions = [
    [x - 5, y - 12], [x - 2, y - 13], [x + 2, y - 13], [x + 5, y - 12],
    [x - 4, y - 9],  [x - 1, y - 9],  [x + 1, y - 9],  [x + 4, y - 9],
  ]
  eyePositions.forEach(([ex, ey]) => {
    ctx.beginPath(); ctx.arc(ex, ey, 1.3, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath(); ctx.arc(ex, ey, 0.6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
  })
}

function drawAnimalSprite(ctx, x, y, animal) {
  switch (animal) {
    case 'frog':        drawFrog(ctx, x, y);        break
    case 'boxElderBug': drawBoxElderBug(ctx, x, y); break
    case 'snake':       drawSnake(ctx, x, y);       break
    case 'ladybug':     drawLadybug(ctx, x, y);     break
    case 'ant':         drawAnt(ctx, x, y);         break
    case 'butterfly':   drawButterfly(ctx, x, y);   break
    case 'spider':      drawSpider(ctx, x, y);      break
    default:            drawFrog(ctx, x, y)
  }
}

// ─── Customer drawing ─────────────────────────────────────────────────────────

function drawCustomer(ctx, customer) {
  const { x, y, name, animal, color, mood, state, order } = customer
  if (state === 'gone') return

  const r = 20 // mood ring radius

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.beginPath()
  ctx.ellipse(x + 2, y + 18, r * 0.75, r * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Draw the animal portrait
  drawAnimalSprite(ctx, x, y, animal || 'frog')

  // Mood ring (drawn on top, around the whole sprite)
  const moodColor = mood === 'happy'    ? C.mood_happy
    : mood === 'unhappy'                ? C.mood_unhappy
    : mood === 'impatient'              ? C.mood_impatient
    : 'rgba(255,255,255,0.5)'
  ctx.strokeStyle = moodColor
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()

  // Name tag below
  ctx.fillStyle = 'rgba(20,10,0,0.65)'
  ctx.font = 'bold 9px Lato, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(name, x, y + r + 12)

  // Speech bubble if ordering/waiting
  if ((state === 'waiting' || state === 'seated') && order) {
    drawSpeechBubble(ctx, x, y - r - 4, order.itemEmoji + ' ' + order.itemName)
  }

  // Mood overlay emoji
  if (state === 'served' || mood === 'happy') {
    ctx.font = '11px serif'
    ctx.textAlign = 'center'
    ctx.fillText('😊', x + r - 2, y - r + 2)
  } else if (mood === 'impatient') {
    ctx.font = '11px serif'
    ctx.textAlign = 'center'
    ctx.fillText('😤', x + r - 2, y - r + 2)
  } else if (mood === 'unhappy') {
    ctx.font = '11px serif'
    ctx.textAlign = 'center'
    ctx.fillText('😞', x + r - 2, y - r + 2)
  }

  ctx.textAlign = 'left'
}

function drawSpeechBubble(ctx, x, y, text) {
  const padding = 6
  ctx.font = '11px Lato, sans-serif'
  const tw = ctx.measureText(text).width
  const bw = tw + padding * 2
  const bh = 22
  const bx = x - bw / 2
  const by = y - bh - 6

  // Bubble body
  ctx.fillStyle = C.speechBg
  ctx.beginPath()
  ctx.roundRect(bx, by, bw, bh, 6)
  ctx.fill()
  ctx.strokeStyle = C.speechBorder
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Tail
  ctx.fillStyle = C.speechBg
  ctx.beginPath()
  ctx.moveTo(x - 5, by + bh)
  ctx.lineTo(x + 5, by + bh)
  ctx.lineTo(x, by + bh + 6)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = C.speechBorder
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - 5, by + bh - 1)
  ctx.lineTo(x, by + bh + 6)
  ctx.lineTo(x + 5, by + bh - 1)
  ctx.stroke()

  // Text
  ctx.fillStyle = '#3a2208'
  ctx.font = '11px Lato, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, x, by + bh - 6)
  ctx.textAlign = 'left'
}

// ─── Time-of-day ambient overlay ──────────────────────────────────────────────

function drawAmbientOverlay(ctx, gameTimeMinutes) {
  // Warm morning glow at start, neutral midday, gentle blue-orange evening
  const hour = gameTimeMinutes / 60
  let alpha = 0
  let overlayColor = 'rgba(255,180,80,'

  if (hour < 9) {
    // Morning warm glow
    alpha = 0.06 * (1 - (hour - 8))
    overlayColor = 'rgba(255,180,80,'
  } else if (hour >= 17) {
    // Evening golden hour
    alpha = 0.05 * ((hour - 17) / 3)
    overlayColor = 'rgba(255,140,60,'
  }

  if (alpha > 0) {
    ctx.fillStyle = overlayColor + alpha + ')'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  }
}

// ─── Main render ──────────────────────────────────────────────────────────────

export function render(ctx, { customers, tableOccupancy, gameTimeMinutes, dayRunning, dayEnded }) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  drawFloor(ctx)
  drawRug(ctx)
  drawWalls(ctx)
  drawWindows(ctx)
  drawCounter(ctx)

  // Plants in corners
  drawPlant(ctx, 40, 155)
  drawPlant(ctx, CANVAS_W - 40, 155)

  drawTables(ctx, tableOccupancy || {})

  // Draw customers sorted by Y so nearer ones appear on top
  const sorted = [...(customers || [])].sort((a, b) => a.y - b.y)
  sorted.forEach(c => drawCustomer(ctx, c))

  drawAmbientOverlay(ctx, gameTimeMinutes)

  // Closed overlay
  if (!dayRunning && !dayEnded) {
    ctx.fillStyle = 'rgba(30,16,4,0.45)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#f5e6b0'
    ctx.font = 'italic bold 32px "Playfair Display", serif'
    ctx.textAlign = 'center'
    ctx.fillText('Closed', CANVAS_W / 2, CANVAS_H / 2 - 10)
    ctx.font = '16px Lato, sans-serif'
    ctx.fillStyle = '#d4c48a'
    ctx.fillText('Press "Open for the Day" to begin', CANVAS_W / 2, CANVAS_H / 2 + 20)
    ctx.textAlign = 'left'
  }

  if (dayEnded) {
    ctx.fillStyle = 'rgba(30,16,4,0.55)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#f5e6b0'
    ctx.font = 'italic bold 32px "Playfair Display", serif'
    ctx.textAlign = 'center'
    ctx.fillText('Closed for the Evening', CANVAS_W / 2, CANVAS_H / 2 - 10)
    ctx.font = '16px Lato, sans-serif'
    ctx.fillStyle = '#d4c48a'
    ctx.fillText('Check your earnings below, then start a new day!', CANVAS_W / 2, CANVAS_H / 2 + 20)
    ctx.textAlign = 'left'
  }
}
