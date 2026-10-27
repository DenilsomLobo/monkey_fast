/**
 * Onça inimiga (cena final). Quadros: assets/movimentação_jaguar.png (escalada e
 * virando de costas) e assets/jaguar.png (rugido).
 * Estados: climb (escalando o tronco), roar, surprised, leap (vira e foge tronco abaixo).
 */
import { SpriteActor } from './SpriteActor.js';
import { DEPTH } from '../config/depths.js';

export class Jaguar {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rotation = 0;
    this.alpha = 1;
    this.state = 'climb';
    this.time = 0;
    const { climb, turn } = scene.cache.json.get('sprites').jaguar.anims;
    this.actor = new SpriteActor(scene, 'jaguar', {
      climb: { frames: climb, fps: 7, pivot: 'center', pingpong: true },
      roar: { frames: ['roar'], fps: 1, pivot: 'center' },
      surprised: { frames: [turn[0]], fps: 1, pivot: 'center' },
      leap: { frames: turn, fps: 10, pivot: 'center', loop: false },
    }, { depth: DEPTH.characters });
    this.actor.play('climb');
    this.g = this.actor.image; // compatibilidade (visibilidade)
  }

  setState(s) {
    this.state = s;
    this.time = 0;
    this.actor.play(s);
  }

  get headWorld() {
    // cabeça fica no alto, à direita do quadro de escalada
    return this.actor.framePointToWorld(0.62, 0.18);
  }

  update(dt) {
    this.time += dt;
    this.actor.update(dt);
    let jolt = 0;
    if (this.state === 'surprised') jolt = Math.sin(this.time * 60) * 4 * Math.max(0, 1 - this.time * 1.5);
    // rugido: o corpo "estufa" de leve
    const k = this.state === 'roar' ? 1 + 0.035 * Math.sin(this.time * 18) : 1;
    this.actor.setPosition(this.x + jolt, this.y).setRotation(this.rotation).setAlpha(this.alpha).setScaleMul(k);
  }

  setVisible(v) {
    this.actor.setVisible(v);
  }

  destroy() {
    this.actor.destroy();
  }
}
