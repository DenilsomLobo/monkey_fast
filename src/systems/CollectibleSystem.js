/** Cria, anima, coleta e descarta bananas e power-ups. */
import { Banana } from '../entities/Banana.js';
import { PowerUp } from '../entities/PowerUp.js';
import { canCollect } from '../core/collectibleGeometry.js';
import { DEPTH } from '../config/depths.js';

export class CollectibleSystem {
  constructor(scene, level, { quality = 'high' } = {}) {
    this.scene = scene;
    this.items = [
      ...level.bananas.map((b) => ({ kind: 'banana', entity: new Banana(scene, b) })),
      ...level.powerups.map((p) => ({ kind: 'powerup', entity: new PowerUp(scene, p) })),
    ];
    this.items.sort((a, b) => a.entity.data.x - b.entity.data.x);
    this.burst = scene.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 260 },
      lifespan: { min: 250, max: 600 },
      scale: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(DEPTH.effects);
    this.quality = quality;
  }

  /**
   * Verifica coletas. body = centro do corpo do macaco; prev = posição anterior
   * (teste por segmento: não perde itens em alta velocidade).
   */
  update(time, body, prev, cam) {
    const view = cam.worldView;
    const collected = [];
    for (const it of this.items) {
      const e = it.entity;
      if (e.collected) continue;
      const d = e.data;
      e.setVisible(d.x > view.x - 120 && d.x < view.right + 120 && d.y > view.y - 120 && d.y < view.bottom + 120);
      e.update(time);
      if (canCollect(prev, body, d)) {
        e.collect(this.scene);
        this.burst.setParticleTint?.(it.kind === 'banana' ? 0xffd040 : e.info.color);
        this.burst.explode(it.kind === 'banana' ? 10 : 28, d.x, d.y);
        this.floatText(d.x, d.y - 20, it.kind === 'banana' ? '+1' : e.info.name, it.kind === 'banana' ? '#ffd84d' : e.info.css);
        collected.push(it);
      }
    }
    return collected;
  }

  floatText(x, y, text, color) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'Bangers, Impact, sans-serif',
      fontSize: text.length > 3 ? '30px' : '26px',
      color,
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTH.overlayText);
    this.scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  destroy() {
    for (const it of this.items) if (!it.entity.collected) it.entity.destroy();
    this.burst.destroy();
  }
}

