/**
 * Visual de um cipó: quadros de assets/cipo_nnormal_movimentos (balanço orgânico)
 * e, na Goiaba Mágica, os quadros de assets/cipo_magico-movimentos com brilho
 * neon verde. A física (ângulo, comprimento) vem de core/vinePhysics.
 */
import Phaser from 'phaser';
import { DEPTH } from '../config/depths.js';

// largura proporcional ao comprimento (cipós longos um pouco mais grossos).
// Para engrossar/afinar todos, mude WIDTH (1 = largura original da arte).
const WIDTH = 0.5;
const widthScale = (len) => WIDTH * (0.62 + 0.0012 * len);
const TOP_OVERLAP = 16; // o topo do cipó fica escondido na copa
const FPS = 5;

export class VineView {
  constructor(scene, vine, { glow = true } = {}) {
    this.scene = scene;
    this.vine = vine;
    const sprites = scene.cache.json.get('sprites');
    this.normal = sprites.vines.normal;
    this.magicFrames = sprites.vines.magic;
    this.phase = (vine.id * 0.37) % 1;
    this.t = this.phase * 10;
    this.frame = -1;

    this.green = scene.add.image(vine.ax, vine.ay, 'vine/normal_0').setDepth(DEPTH.vines);
    this.magic = scene.add.image(vine.ax, vine.ay, 'vine/magic_0').setDepth(DEPTH.vines + 0.1).setAlpha(0).setVisible(false);
    // luz neon verde ao redor do cipó mágico
    this.neon = scene.add.image(vine.ax, vine.ay, 'glow').setDepth(DEPTH.vines - 0.1).setTint(0x39ff6a)
      .setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 0.15).setVisible(false);
    if (glow && scene.game.renderer.type === Phaser.WEBGL && this.magic.preFX) {
      this.fx = this.magic.preFX.addGlow(0x44ff66, 3, 0, false, 0.1, 10);
    }
    this.flash = 0;
    this.visible = true;
    this.setFrame(0);
  }

  setFrame(i) {
    if (i === this.frame) return;
    this.frame = i;
    const L = this.vine.length + TOP_OVERLAP;
    const n = this.normal[i % this.normal.length];
    const wx = widthScale(this.vine.length);
    this.green.setTexture(`vine/normal_${i % this.normal.length}`).setOrigin(n.top.x, TOP_OVERLAP / L)
      .setScale(wx, L / n.h);
    const m = this.magicFrames[i % this.magicFrames.length];
    this.magic.setTexture(`vine/magic_${i % this.magicFrames.length}`).setOrigin(m.top.x, TOP_OVERLAP / L)
      .setScale(wx, (L + 20) / m.h);
  }

  setVisible(v) {
    if (v === this.visible) return;
    this.visible = v;
    this.green.setVisible(v);
    if (!v) {
      this.magic.setVisible(false);
      this.neon.setVisible(false);
    }
  }

  /** magic: 0..1 (nível da Goiaba). */
  update(dt, magic) {
    if (!this.visible) return;
    // animação de quadros (vai e volta), mais rápida quando o cipó balança forte
    this.t += dt * FPS * (1 + Math.min(1.5, Math.abs(this.vine.omega) * 0.4)) * (1 + magic * 0.6);
    const n = this.normal.length;
    const k = Math.floor(this.t) % (n * 2 - 2);
    this.setFrame(k < n ? k : n * 2 - 2 - k);

    const rot = -this.vine.theta;
    this.green.setRotation(rot).setAlpha(1 - magic * 0.85);
    if (magic > 0.01) {
      const pulse = 0.75 + 0.25 * Math.sin(this.t * 1.7);
      this.magic.setVisible(true).setRotation(rot).setAlpha(magic);
      this.neon.setVisible(true).setRotation(rot).setPosition(this.vine.ax, this.vine.ay)
        .setScale(1.3 * WIDTH * 1.4, (this.vine.length / 128) * 1.5).setAlpha(0.35 * magic * pulse);
      if (this.fx) this.fx.outerStrength = 2 + 3 * pulse * magic;
    } else if (this.magic.visible) {
      this.magic.setVisible(false);
      this.neon.setVisible(false);
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 3);
      const c = Math.round(255 - 60 * this.flash);
      this.green.setTint(Phaser.Display.Color.GetColor(255, 255, c));
      if (this.flash === 0) this.green.clearTint();
    }
  }

  /** Brilho rápido ao ser agarrado (feedback visual). */
  pulse() {
    this.flash = 1;
  }

  destroy() {
    this.green.destroy();
    this.magic.destroy();
    this.neon.destroy();
  }
}
