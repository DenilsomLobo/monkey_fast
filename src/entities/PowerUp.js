/** Power-up (Manga Mágica ou Goiaba Mágica): fruta brilhante com aura pulsante. */
import Phaser from 'phaser';
import { DEPTH } from '../config/depths.js';

export const POWERUP_INFO = {
  mango: { texture: 'manga', color: 0xff4fd8, css: '#ff4fd8', name: 'MANGA MÁGICA', sound: 'mango' },
  guava: { texture: 'goiaba', color: 0x39ff6a, css: '#7dff9a', name: 'GOIABA MÁGICA', sound: 'guava' },
};

export class PowerUp {
  constructor(scene, data) {
    this.data = data;
    this.info = POWERUP_INFO[data.type];
    this.collected = false;
    this.glow = scene.add.image(data.x, data.y, 'glow').setTint(this.info.color).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.9).setAlpha(0.6).setDepth(DEPTH.items);
    this.sprite = scene.add.image(data.x, data.y, this.info.texture).setScale(0.42).setDepth(DEPTH.items + 0.1);
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
    const t = time * 0.0025;
    const y = this.data.y + Math.sin(t * 1.3) * 7;
    this.sprite.setY(y).setScale(0.42 + Math.sin(t * 4) * 0.02).setRotation(Math.sin(t) * 0.2);
    this.glow.setY(y).setScale(0.85 + Math.sin(t * 3) * 0.12).setAlpha(0.45 + 0.2 * Math.sin(t * 5));
  }

  collect(scene) {
    this.collected = true;
    scene.tweens.add({ targets: this.sprite, scale: 1.1, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => this.sprite.destroy() });
    scene.tweens.add({ targets: this.glow, scale: 3, alpha: 0, duration: 450, onComplete: () => this.glow.destroy() });
  }

  destroy() {
    this.sprite.destroy();
    this.glow.destroy();
  }
}
