/**
 * Clima: chuva em duas camadas, vegetação de primeiro plano, folhas levadas
 * pelo vento, relâmpagos que iluminam o cenário, trovões e vinheta.
 */
import Phaser from 'phaser';
import { DEPTH } from '../config/depths.js';
import { AudioManager } from './AudioManager.js';

export class WeatherSystem {
  constructor(scene, parallax, { quality = 'high', lightning = true } = {}) {
    this.scene = scene;
    this.parallax = parallax;
    this.quality = quality;
    this.intensity = 1;
    this.flash = 0;
    this.nextStrike = Phaser.Math.Between(3000, 7000);
    this.lightningEnabled = lightning;

    this.rainFar = scene.add.tileSprite(0, 0, 10, 10, 'rain_far').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.rainFar).setAlpha(0.55);
    this.rainNear = scene.add.tileSprite(0, 0, 10, 10, 'rain_near').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.rainNear).setAlpha(0.5);
    if (quality === 'low') this.rainFar.setVisible(false);
    this.fg = scene.add.tileSprite(0, 0, 10, 10, 'foreground').setOrigin(0, 1).setScrollFactor(0).setDepth(DEPTH.foreground);

    this.bolt = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.bolt);
    this.boltLife = 0;
    this.flashRect = scene.add.rectangle(0, 0, 10, 10, 0xdde8ff).setOrigin(0).setScrollFactor(0)
      .setDepth(DEPTH.flash).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.vignette = scene.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.vignette);

    this.leaves = scene.add.particles(0, 0, 'leaf', {
      speedX: { min: -260, max: -90 },
      speedY: { min: 30, max: 120 },
      rotate: { start: 0, end: 720 },
      scale: { min: 0.5, max: 1.1 },
      lifespan: 7000,
      frequency: quality === 'low' ? 900 : 260,
      tint: [0x4f9a36, 0x6fae3e, 0x3a6e28, 0x8a7a30],
    }).setScrollFactor(0).setDepth(DEPTH.rainFar - 0.5);

    this.resize();
  }

  resize() {
    const { width, height } = this.scene.scale;
    this.width = width;
    this.height = height;
    for (const ts of [this.rainFar, this.rainNear]) ts.setSize(width, height);
    // folhagem da frente ocupa ~40% da altura da tela (qualquer tamanho de PNG)
    const fgH = this.scene.textures.get('foreground').getSourceImage().height;
    const fgScale = (this.fgScale = (height * 0.4) / fgH);
    this.fg.setSize(width / fgScale, fgH).setScale(fgScale).setPosition(0, height + 30);
    this.flashRect.setSize(width, height);
    this.vignette.setDisplaySize(width, height);
    // folhas entram pela direita, em toda a altura
    this.leaves.setPosition(width + 30, 0);
    this.leaves.clearEmitZones();
    this.leaves.addEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(0, -40, 20, height * 0.9) });
  }

  /** intensity > 1 acelera chuva/folhas (power-ups). */
  update(dt, cam, intensity = 1) {
    this.intensity = intensity;
    const k = intensity;
    this.rainFar.tilePositionY -= 900 * dt * k;
    this.rainFar.tilePositionX += 250 * dt * k;
    this.rainNear.tilePositionY -= 1500 * dt * k;
    this.rainNear.tilePositionX += 420 * dt * k;
    // a chuva também se move com a câmera (sensação de profundidade)
    this.rainNear.tilePositionX += (cam.scrollX - (this.lastCamX ?? cam.scrollX)) * 0.4;
    this.rainNear.tilePositionY += (cam.scrollY - (this.lastCamY ?? cam.scrollY)) * 0.4;
    this.lastCamX = cam.scrollX;
    this.lastCamY = cam.scrollY;
    // move um pouco mais rápido que o mundo (está mais perto da câmera)
    this.fg.tilePositionX = (cam.scrollX * 1.15) / this.fgScale;
    this.leaves.timeScale = k;

    if (this.lightningEnabled) {
      this.nextStrike -= dt * 1000;
      if (this.nextStrike <= 0) {
        this.strike(Phaser.Math.FloatBetween(0.5, 1));
        this.nextStrike = Phaser.Math.Between(6000, 14000);
      }
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 2.2);
      // tremulação do clarão
      const flicker = this.flash > 0.5 ? (Math.random() < 0.35 ? 0.4 : 1) : 1;
      this.flashRect.setAlpha(this.flash * 0.55 * flicker);
      this.parallax?.setFlash(this.flash);
    }
    if (this.boltLife > 0) {
      this.boltLife -= dt;
      this.bolt.setAlpha(Math.max(0, this.boltLife / 0.35));
      if (this.boltLife <= 0) this.bolt.clear();
    }
  }

  /** Relâmpago: clarão + raio desenhado no céu + trovão com atraso. */
  strike(power = 1, { x, sound = true } = {}) {
    this.flash = Math.max(this.flash, power);
    const w = this.width;
    const h = this.height;
    let px = x ?? Phaser.Math.FloatBetween(w * 0.1, w * 0.9);
    let py = -10;
    const g = this.bolt;
    g.clear();
    const drawBranch = (sx, sy, len, width, alpha) => {
      let bx = sx;
      let by = sy;
      g.lineStyle(width, 0xe8f0ff, alpha);
      g.beginPath();
      g.moveTo(bx, by);
      for (let i = 0; i < len; i++) {
        bx += Phaser.Math.FloatBetween(-24, 24);
        by += Phaser.Math.FloatBetween(14, 34);
        g.lineTo(bx, by);
      }
      g.strokePath();
    };
    g.lineStyle(10, 0x8fb0ff, 0.25);
    const pts = [{ x: px, y: py }];
    const segs = Phaser.Math.Between(9, 14);
    for (let i = 0; i < segs; i++) {
      px += Phaser.Math.FloatBetween(-30, 30);
      py += Phaser.Math.FloatBetween(h * 0.025, h * 0.055);
      pts.push({ x: px, y: py });
    }
    g.strokePoints(pts);
    g.lineStyle(3, 0xffffff, 1);
    g.strokePoints(pts);
    for (let i = 2; i < pts.length - 2; i += 3) drawBranch(pts[i].x, pts[i].y, 4, 1.5, 0.8);
    g.setAlpha(1);
    this.boltLife = 0.35;
    if (sound) AudioManager.play('thunder', { intensity: power, delay: Phaser.Math.FloatBetween(0.15, 1.2) * (1.2 - power), minGap: 0.5 });
  }

  destroy() {
    for (const o of [this.rainFar, this.rainNear, this.fg, this.bolt, this.flashRect, this.vignette, this.leaves]) o.destroy();
  }
}
