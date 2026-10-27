/**
 * Sequência cinematográfica do resgate (≈ 13 s), na ordem do GDD:
 *  1. Chegada  2. Confronto (grito + batidas no peito)  3. Tempestade
 *  4. A onça se assusta e foge  5. Reencontro (abraço)  6. Coração → VITÓRIA!!!
 *
 * Os atores (companheira e onça) existem desde o início da fase, no topo
 * da árvore mais alta, e ficam animados até o macaco chegar.
 */
import Phaser from 'phaser';
import { Companion } from '../entities/Companion.js';
import { Jaguar } from '../entities/Jaguar.js';
import { AudioManager } from './AudioManager.js';
import { PHYS } from '../core/constants.js';
import { DEPTH } from '../config/depths.js';

// posição da onça em relação à face do tronco (x) e ao topo do galho (y)
const JAGUAR_FACE_OFFSET = 15;
const JAGUAR_DROP = 70;

export class VictoryCutscene {
  constructor(scene, { platform, trunkFaceX, fxScene = scene }) {
    this.scene = scene;
    this.fxScene = fxScene;
    this.platform = platform;
    this.companion = new Companion(scene, platform.x1 + (platform.x2 - platform.x1) * 0.42, platform.y + 4);
    // a onça escala o tronco logo abaixo do galho, do lado de onde vem o macaco,
    // de perfil, com as garras encostadas na face do tronco
    const jx = (trunkFaceX ?? platform.x2 + 30) - JAGUAR_FACE_OFFSET;
    this.jaguarBaseY = platform.y + JAGUAR_DROP;
    this.jaguar = new Jaguar(scene, jx, this.jaguarBaseY);
    this.playing = false;
    this.time = 0;
    this.roarTimer = 3;
  }

  /** Animação contínua antes e durante a cena. */
  update(dt, camView) {
    const near = camView ? camView.right > this.platform.x1 - 300 : true;
    this.companion.setVisible(near);
    if (!this.jaguar.gone) this.jaguar.setVisible(near);
    if (!near && !this.playing) return;
    this.time += dt;
    this.companion.update(dt);
    if (this.jaguar.state === 'climb') {
      // tenta subir mas escorrega (ameaça constante)
      this.jaguar.y = this.jaguarBaseY + Math.sin(this.time * 1.3) * 10;
    }
    if (!this.jaguar.gone) this.jaguar.update(dt);
    // rugidos de ameaça quando o jogador se aproxima
    if (!this.playing && near) {
      this.roarTimer -= dt;
      if (this.roarTimer <= 0) {
        AudioManager.play('roar', { minGap: 2 });
        this.roarTimer = Phaser.Math.FloatBetween(4, 7);
      }
    }
  }

  /**
   * @param ctx { monkey, camera, weather, perfect, onComplete }
   */
  play(ctx) {
    this.playing = true;
    const { scene } = this;
    const { monkey, camera, weather } = ctx;
    const sim = monkey.sim;
    const p = this.platform;
    const at = (sec, fn) => scene.time.delayedCall(sec * 1000, fn);
    const standX = p.x2 - 120;

    // ---------------- CENA 1 — CHEGADA
    camera.frozen = true;
    // folhagem de primeiro plano fica discreta para não esconder a cena
    scene.tweens.add({ targets: weather.fg, alpha: 0.25, duration: 800 });
    // enquadra companheira, macaco e a onça no tronco à direita
    camera.panTo((standX + this.companion.x) / 2 + 110, p.y - 140, 1400);
    camera.zoomTo(1.3, 1400);
    monkey.setScripted('idle');
    this.companion.setState('scared');
    this.companion.facing = 1;
    at(0.5, () => {
      monkey.setScripted('walk');
      sim.facing = 1;
      scene.tweens.add({
        targets: sim, x: standX, duration: 900, ease: 'Sine.easeInOut',
        onComplete: () => monkey.setScripted('idle'),
      });
    });
    at(0.7, () => { this.jaguar.setState('roar'); AudioManager.play('roar'); });

    // ---------------- CENA 2 — CONFRONTO
    at(1.6, () => {
      sim.facing = 1;
      monkey.setScripted('scream');
      AudioManager.play('scream');
      this.jaguar.setState('climb');
    });
    at(2.8, () => {
      monkey.setScripted('chestBeat');
      for (let i = 0; i < 10; i++) at(i * 0.16, () => AudioManager.play('chest', { minGap: 0.05 }));
    });

    // ---------------- CENA 3 — TEMPESTADE
    at(4.4, () => { weather.strike(1, { x: scene.scale.width * 0.3 }); camera.shake(500, 0.008); monkey.setScripted('scream'); AudioManager.play('scream'); });
    at(4.9, () => { weather.strike(0.9, { x: scene.scale.width * 0.7 }); camera.shake(400, 0.006); });
    at(5.5, () => { weather.strike(1, { x: scene.scale.width * 0.5 }); camera.shake(600, 0.01); });

    // ---------------- CENA 4 — A ONÇA SE ASSUSTA
    at(6.0, () => {
      this.jaguar.setState('surprised');
      AudioManager.play('jaguarScared');
      const head = this.jaguar.headWorld ?? { x: this.jaguar.x, y: this.jaguar.y - 80 };
      const ex = scene.add.text(head.x, head.y - 75, '!', {
        fontFamily: 'Bangers, Impact, sans-serif', fontSize: '84px', color: '#ffdd33', stroke: '#000', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(DEPTH.overlayText).setScale(0);
      scene.tweens.add({ targets: ex, scale: 1, duration: 260, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: ex, y: ex.y - 10, yoyo: true, repeat: 3, duration: 120, delay: 260 });
      at(1.2, () => scene.tweens.add({ targets: ex, alpha: 0, duration: 200, onComplete: () => ex.destroy() }));
      monkey.setScripted('chestBeat');
    });
    at(6.8, () => {
      // vira de costas e escorrega tronco abaixo, sumindo na névoa
      const j = this.jaguar;
      j.setState('leap');
      AudioManager.play('whoosh');
      scene.tweens.add({ targets: j, y: j.y + 900, delay: 450, duration: 1100, ease: 'Sine.easeIn' });
      scene.tweens.add({ targets: j, alpha: 0, delay: 1100, duration: 450, onComplete: () => { j.gone = true; j.destroy(); } });
    });

    // ---------------- CENA 5 — REENCONTRO
    at(7.6, () => {
      monkey.setScripted('idle');
      sim.facing = -1;
      this.companion.setState('run');
      this.companion.facing = 1;
      scene.tweens.add({
        targets: this.companion, x: standX - 50, duration: 800, ease: 'Sine.easeOut',
        onComplete: () => {
          this.companion.setState('hug');
          monkey.setScripted('hug');
          AudioManager.play('hug');
          AudioManager.setMusic('victory');
        },
      });
    });

    // ---------------- CENA 6 — CORAÇÃO E VITÓRIA
    at(9.3, () => this.heart(standX - 25, p.y - PHYS.GRAB_TO_FEET - 30, ctx));
  }

  heart(x, y, ctx) {
    const { scene } = this;
    const cam = scene.cameras.main;
    const heart = scene.add.image(x, y, 'heart').setDepth(DEPTH.overlayText - 1).setScale(0.12);
    const glow = scene.add.image(x, y, 'glow').setDepth(DEPTH.overlayText - 2).setTint(0xff3b5c).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3);
    AudioManager.play('heart');
    const targetScale = (scene.scale.height / cam.zoom) * 0.75 / 116;
    scene.tweens.add({ targets: [heart], y: y - 140, duration: 900, ease: 'Sine.easeOut' });
    scene.tweens.add({ targets: [glow], y: y - 140, duration: 900, ease: 'Sine.easeOut' });
    scene.tweens.add({
      targets: heart, scale: targetScale, delay: 700, duration: 1700, ease: 'Cubic.easeIn',
      onUpdate: () => glow.setPosition(heart.x, heart.y).setScale(heart.scale * 3),
    });
    scene.tweens.add({ targets: heart, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 300 });
    scene.time.delayedCall(1300, () => AudioManager.play('heart'));
    scene.time.delayedCall(2300, () => this.finalText(ctx));
  }

  finalText(ctx) {
    const scene = this.fxScene;
    this.overlayObjects = [];
    const { width, height } = scene.scale;
    const style = { fontFamily: 'Bangers, Impact, sans-serif', color: '#fff3c2', stroke: '#5a0010', strokeThickness: 10 };
    const t1 = scene.add.text(width / 2, height * 0.42, 'VITÓRIA!!!', { ...style, fontSize: `${Math.round(height * 0.16)}px` })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.overlayText + 5).setScale(0);
    const t2 = scene.add.text(width / 2, height * 0.58, 'FIM DE JOGO', { ...style, fontSize: `${Math.round(height * 0.07)}px` })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.overlayText + 5).setAlpha(0);
    this.overlayObjects.push(t1, t2);
    scene.tweens.add({ targets: t1, scale: 1, duration: 500, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: t2, alpha: 1, delay: 500, duration: 400 });
    AudioManager.play('perfect', { minGap: 0 });
    if (ctx.perfect) {
      scene.time.delayedCall(900, () => {
        const pr = scene.add.text(width / 2, height * 0.73, 'PERFECT RUN!', { ...style, fontSize: `${Math.round(height * 0.09)}px`, color: '#ffe066', stroke: '#6a0050' })
          .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.overlayText + 6).setScale(0);
        this.overlayObjects.push(pr);
        scene.tweens.add({ targets: pr, scale: 1, duration: 450, ease: 'Back.easeOut' });
        scene.tweens.add({ targets: pr, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 220 });
        const conf = scene.add.particles(0, 0, 'spark', {
          x: { min: 0, max: width }, y: -20, speedY: { min: 150, max: 380 }, speedX: { min: -80, max: 80 },
          lifespan: 2600, scale: { start: 0.7, end: 0.2 }, tint: [0xffd84d, 0xff4fd8, 0x7fe8ff, 0x9bff7a],
          blendMode: 'ADD', frequency: 18,
        }).setScrollFactor(0).setDepth(DEPTH.overlayText + 4);
        this.overlayObjects.push(conf);
        scene.time.delayedCall(2500, () => conf.stop());
        AudioManager.play('perfect', { minGap: 0 });
      });
    }
    scene.time.delayedCall(ctx.perfect ? 3400 : 2400, () => ctx.onComplete?.());
  }

  destroy() {
    for (const o of this.overlayObjects ?? []) o.destroy();
    this.companion.destroy();
    if (!this.jaguar.gone) this.jaguar.destroy();
  }
}
