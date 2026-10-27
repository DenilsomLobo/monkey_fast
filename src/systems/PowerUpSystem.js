/**
 * Efeitos dos power-ups no jogo (a contagem de tempo vem de core/powerUpTimers).
 *
 * MANGA MÁGICA  → macaco mais rápido, impulso maior, raios, olhos brilhando, rastro.
 * GOIABA MÁGICA → cipós mágicos com neon verde e mais rápidos, distorção temporal.
 * Ambos         → música 2X (uma vez só), chuva/paralaxe/folhas mais intensas.
 */
import Phaser from 'phaser';
import { PowerUpTimers } from '../core/powerUpTimers.js';
import { GUAVA_VINE_SPEED } from '../core/constants.js';
import { AudioManager } from './AudioManager.js';
import { DEPTH } from '../config/depths.js';

export class PowerUpSystem {
  constructor(scene, { quality = 'high', fxScene = scene } = {}) {
    this.scene = scene;
    this.fxScene = fxScene;
    this.timers = new PowerUpTimers();
    this.quality = quality;
    this.time = 0;
    this.fx = null;
    const cam = scene.cameras.main;
    if (quality !== 'low' && scene.game.renderer.type === Phaser.WEBGL && cam.postFX) {
      this.barrel = cam.postFX.addBarrel(1);
      this.colorFx = cam.postFX.addColorMatrix();
      this.barrel.active = false;
      this.colorFx.active = false;
    }
    // partículas mágicas pela tela durante a goiaba
    this.magicDust = fxScene.add.particles(0, 0, 'spark', {
      speedY: { min: -40, max: -10 },
      speedX: { min: -30, max: 30 },
      lifespan: 1600,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0x39ff6a, 0xb8ffc8, 0x7fe8ff],
      blendMode: 'ADD',
      frequency: quality === 'low' ? 120 : 40,
      emitting: false,
    }).setScrollFactor(0).setDepth(DEPTH.effects);
    this.resize();
  }

  resize() {
    const { width, height } = this.fxScene.scale;
    this.magicDust.clearEmitZones();
    this.magicDust.addEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(0, 0, width, height) });
  }

  activate(type) {
    const wasActive = this.timers.isActive(type);
    this.timers.activate(type);
    AudioManager.play(type);
    if (type === 'guava' && !wasActive) AudioManager.play('warp', { minGap: 0.2 });
    this.scene.cameras.main.flash(250, type === 'mango' ? 120 : 60, type === 'mango' ? 220 : 255, type === 'mango' ? 255 : 120, false);
  }

  /** Avança o tempo e devolve os modificadores de física. */
  update(dt) {
    this.time += dt;
    const expired = this.timers.update(dt);
    if (expired.length) AudioManager.play('powerEnd');
    AudioManager.setMusicRate(this.timers.musicRate());

    const guava = this.timers.level('guava');
    if (this.barrel) {
      this.barrel.active = guava > 0.01;
      this.barrel.amount = 1 + guava * 0.06 * Math.sin(this.time * 5);
      this.colorFx.active = guava > 0.01;
      if (guava > 0.01) {
        this.colorFx.reset();
        this.colorFx.hue(guava * 25 * Math.sin(this.time * 1.7));
      }
    }
    this.magicDust.emitting = guava > 0.2;
    return this.mods();
  }

  mods() {
    return {
      mango: this.timers.level('mango'),
      vineTime: 1 + (GUAVA_VINE_SPEED - 1) * this.timers.level('guava'),
    };
  }

  /** Intensidade visual (chuva, paralaxe, folhas) — 1 normal, até 1.8 com power-ups. */
  intensity() {
    return 1 + 0.8 * Math.max(this.timers.level('mango'), this.timers.level('guava'));
  }

  destroy() {
    // ao reiniciar a cena o Phaser pode já ter destruído a câmera
    const cam = this.scene.cameras?.main;
    if (this.barrel && cam?.postFX) cam.postFX.clear();
    this.magicDust.destroy();
  }
}
