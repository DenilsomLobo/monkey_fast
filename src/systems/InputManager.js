/**
 * Junta teclado e controles virtuais num único estado de entrada.
 * O "pulo" é um evento: cada toque/tecla vale para exatamente um passo de física.
 */
import Phaser from 'phaser';
import { VirtualJoystick } from '../ui/VirtualJoystick.js';
import { isTouchDevice } from '../ui/dom.js';

export class InputManager {
  constructor(scene, { uiRoot, onPause } = {}) {
    this.scene = scene;
    this.jumpQueue = 0;
    this.enabled = true;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const kb = scene.input.keyboard;
    this.keys = kb.addKeys({
      left: K.LEFT, right: K.RIGHT, up: K.UP, down: K.DOWN,
      a: K.A, d: K.D, w: K.W, s: K.S, space: K.SPACE, esc: K.ESC, p: K.P,
    });
    kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    this.keys.space.on('down', () => this.pressJump());
    this.keys.esc.on('down', () => onPause?.());
    this.keys.p.on('down', () => onPause?.());

    this.touch = null;
    if (uiRoot && isTouchDevice()) {
      this.touch = new VirtualJoystick(uiRoot, { onJump: () => this.pressJump() });
    }
  }

  pressJump() {
    if (!this.enabled) return;
    this.jumpQueue = Math.min(this.jumpQueue + 1, 2);
  }

  /** Estado contínuo (direção) — lido a cada passo de física. */
  axes() {
    if (!this.enabled) return { x: 0, y: 0 };
    const k = this.keys;
    let x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    if (this.touch && x === 0 && y === 0) {
      x = this.touch.value.x;
      y = this.touch.value.y;
    }
    return { x, y };
  }

  /** Entrada para um passo de física (consome no máximo um pulo). */
  step() {
    const { x, y } = this.axes();
    const jumpPressed = this.jumpQueue > 0;
    if (jumpPressed) this.jumpQueue--;
    return { x, y, jumpPressed };
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this.jumpQueue = 0;
    this.touch?.setVisible(v);
  }

  destroy() {
    this.touch?.destroy();
    for (const key of Object.values(this.keys)) key.removeAllListeners();
  }
}
