/**
 * Câmera 2D que segue o macaco suavemente, antecipando a direção do movimento
 * (olha um pouco à frente e para onde ele está caindo/subindo).
 */
import Phaser from 'phaser';

export class CameraController {
  constructor(scene, cam) {
    this.scene = scene;
    this.cam = cam;
    this.cx = 0;
    this.cy = 0;
    this.look = { x: 0, y: 0 };
    this.frozen = false;
    this.zoomMul = 1;
    this.resize();
  }

  baseZoom() {
    const { width, height } = this.scene.scale;
    return Phaser.Math.Clamp(Math.min(width / 1150, height / 680), 0.42, 1.5);
  }

  resize() {
    this.cam.setZoom(this.baseZoom() * this.zoomMul);
  }

  snapTo(x, y) {
    this.cx = x;
    this.cy = y;
    this.cam.centerOn(x, y);
  }

  /** target: { x, y, vx, vy, facing } — centro do corpo do macaco. */
  follow(t, dt) {
    if (this.frozen) return;
    const lookX = Phaser.Math.Clamp(t.vx * 0.32, -240, 240) + (t.facing || 1) * 70;
    const lookY = Phaser.Math.Clamp(t.vy * 0.12, -110, 170);
    const kl = 1 - Math.exp(-2.5 * dt);
    this.look.x += (lookX - this.look.x) * kl;
    this.look.y += (lookY - this.look.y) * kl;
    const tx = t.x + this.look.x;
    const ty = t.y + this.look.y - 20;
    const kx = 1 - Math.exp(-4 * dt);
    const ky = 1 - Math.exp(-(t.vy > 600 ? 6 : 3.2) * dt);
    this.cx += (tx - this.cx) * kx;
    this.cy += (ty - this.cy) * ky;
    this.cam.centerOn(this.cx, this.cy);
  }

  /** Aproximação cinematográfica (cena final). */
  zoomTo(mul, duration = 1200) {
    this.scene.tweens.add({
      targets: this,
      zoomMul: mul,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.resize(),
    });
  }

  panTo(x, y, duration = 1200) {
    this.scene.tweens.add({ targets: this, cx: x, cy: y, duration, ease: 'Sine.easeInOut', onUpdate: () => this.cam.centerOn(this.cx, this.cy) });
  }

  shake(duration = 400, intensity = 0.006) {
    this.cam.shake(duration, intensity);
  }
}
