/** Banana dourada colecionável (+1 ponto): flutua, brilha e some ao ser coletada. */
import Phaser from 'phaser';
import { DEPTH } from '../config/depths.js';

export class Banana {
  constructor(scene, data) {
    this.data = data;
    this.collected = false;
    this.phase = (data.x * 0.013) % (Math.PI * 2);
    this.glow = scene.add.image(data.x, data.y, 'glow').setTint(0xffb020).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.55).setAlpha(0.45).setDepth(DEPTH.items);
    this.sprite = scene.add.image(data.x, data.y, 'banana').setScale(0.34).setDepth(DEPTH.items + 0.1);
    this.visible = true;
  }

  setVisible(v) {
    if (v === this.visible || this.collected) return;
    this.visible = v;
    this.sprite.setVisible(v);
    this.glow.setVisible(v);
  }

  update(time) {
    if (this.collected || !this.visible) return;
    const t = time * 0.003 + this.phase;
    const y = this.data.y + Math.sin(t) * 5;
    this.sprite.setY(y).setRotation(Math.sin(t * 0.7) * 0.15);
    this.glow.setY(y).setAlpha(0.35 + 0.15 * Math.sin(t * 2));
  }

  collect(scene) {
    this.collected = true;
    scene.tweens.add({ targets: this.sprite, scale: 0.6, alpha: 0, y: this.sprite.y - 30, duration: 260, ease: 'Back.easeIn', onComplete: () => this.sprite.destroy() });
    scene.tweens.add({ targets: this.glow, scale: 1.4, alpha: 0, duration: 300, onComplete: () => this.glow.destroy() });
  }

  destroy() {
    this.sprite.destroy();
    this.glow.destroy();
  }
}
