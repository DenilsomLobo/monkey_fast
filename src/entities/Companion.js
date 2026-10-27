/** A companheira do chimpanzé (cena final), animada com os quadros da folha de referência. */
import { SpriteActor } from './SpriteActor.js';
import { DEPTH } from '../config/depths.js';

export class Companion {
  constructor(scene, x, groundY) {
    this.x = x;
    this.groundY = groundY;
    this.facing = 1;
    const a = scene.cache.json.get('sprites').companion.anims;
    this.actor = new SpriteActor(scene, 'companion', {
      idle: { frames: a.idle, fps: 6, pivot: 'feet', pingpong: true },
      walk: { frames: a.walk, fps: 11, pivot: 'feet' },
      run: { frames: a.walk, fps: 15, pivot: 'feet' },
      scared: { frames: a.scared, fps: 7, pivot: 'feet', pingpong: true },
      happy: { frames: a.happy, fps: 7, pivot: 'feet', pingpong: true },
      hug: { frames: a.happy, fps: 5, pivot: 'feet', pingpong: true },
    }, { depth: DEPTH.characters + 1 });
    this.actor.play('scared');
    this.time = 0;
  }

  setState(s) {
    this.actor.play(s);
  }

  update(dt) {
    this.time += dt;
    this.actor.setFacing(this.facing);
    this.actor.update(dt);
    const tremble = this.actor.current === 'scared' ? Math.sin(this.time * 50) * 1.2 : 0;
    this.actor.setPosition(this.x + tremble, this.groundY);
  }

  setVisible(v) {
    this.actor.setVisible(v);
  }

  destroy() {
    this.actor.destroy();
  }
}
