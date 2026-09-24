import Phaser from 'phaser'
import './style.css'
import { BootScene } from './scenes/BootScene'
import { MenuScene } from './scenes/MenuScene'
import { ShopScene } from './scenes/ShopScene'
import { GameScene } from './scenes/GameScene'
import { HudScene } from './scenes/HudScene'
import { LevelUpScene } from './scenes/LevelUpScene'
import { PauseScene } from './scenes/PauseScene'
import { ResultScene } from './scenes/ResultScene'
import { StageSelectScene } from './scenes/StageSelectScene'
import { StickerBookScene } from './scenes/StickerBookScene'
import { ChestScene } from './scenes/ChestScene'
import { VictoryScene } from './scenes/VictoryScene'
import { cssHex } from './ui/theme'
import { P } from './art/palette'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: cssHex(P.night),
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: {
      // Top-down: no gravity, and the world is unbounded so the meadow can
      // scroll forever in any direction.
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  // Two fingers is plenty (stick + a tap on the pause button), plus the mouse.
  input: { activePointers: 3 },
  render: { antialias: true },
  // Order matters: scenes later in this list render on top, so the HUD sits
  // above the game and the modal screens sit above the HUD.
  scene: [
    BootScene,
    MenuScene,
    StageSelectScene,
    ShopScene,
    StickerBookScene,
    GameScene,
    HudScene,
    LevelUpScene,
    ChestScene,
    VictoryScene,
    PauseScene,
    ResultScene,
  ],
})

// A handle for poking at a live run from the browser console while developing.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game
