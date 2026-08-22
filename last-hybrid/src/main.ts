import Phaser from 'phaser'
import './style.css'
import { BootScene } from './scenes/BootScene'
import { IntroScene } from './scenes/IntroScene'
import { TitleScene } from './scenes/TitleScene'
import { CreateCharacterScene } from './scenes/CreateCharacterScene'
import { WorldScene } from './scenes/WorldScene'
import { HudScene } from './scenes/HudScene'
import { PauseScene } from './scenes/PauseScene'
import { P } from './art/palette'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: P.void,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: {
      // Top-down, so nothing falls. Set `debug: true` to see the collision
      // boxes the ASCII maps generate.
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    // Stick, an action button, and a spare — a tablet needs all three at once.
    activePointers: 4,
    gamepad: true,
  },
  render: { antialias: true, roundPixels: false },
  // Later scenes render on top: the HUD sits above the world, and pause above
  // both.
  scene: [BootScene, TitleScene, CreateCharacterScene, IntroScene, WorldScene, HudScene, PauseScene],
})

// A handle for poking at the running game from the console — scene state,
// player position, `game.step()` to advance a frame at a time. Dev only, so it
// never reaches a built bundle.
if (import.meta.env.DEV) {
  ;(window as unknown as { game: Phaser.Game }).game = game
}
