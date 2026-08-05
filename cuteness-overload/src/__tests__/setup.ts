// Runs before any test file (and therefore before Phaser is imported): Phaser
// probes canvas capabilities at module-init time and waits on image decoding
// during boot, so both stubs have to be in place first.
import { installCanvasStub, installImageStub } from './canvasStub'

installCanvasStub()
installImageStub()
