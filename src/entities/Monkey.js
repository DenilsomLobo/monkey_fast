/**
 * Entidade do chimpanzé: liga a simulação física (core/monkeySim) aos quadros
 * de animação (SpriteActor), à máquina de estados e aos efeitos.
 *
 * Posição física (sim.x, sim.y) = ponto de agarre (mãos). Conforme o estado:
 *  - no chão: pés em (x, y + GRAB_TO_FEET)
 *  - no ar:   centro do corpo em (x, y + 60)
 *  - no cipó: punho levantado em (x, y), corpo pendurado ao longo do cipó
 */
import Phaser from 'phaser';
import { SpriteActor } from './SpriteActor.js';
import { MonkeyStateMachine } from './MonkeyStateMachine.js';
import { PHYS } from '../core/constants.js';
import { projectOnVine } from '../core/vinePhysics.js';
import { DEPTH } from '../config/depths.js';
import { AudioManager } from '../systems/AudioManager.js';
import { collectibleBody } from '../core/collectibleGeometry.js';

/** Estado de animação → quadros (nomes dos PNGs em public/assets/characters/monkey). */
export const MONKEY_ANIMS = {
  idle: { frames: ['idle'], fps: 1, pivot: 'feet' },
  walk: { frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3'], fps: 8, pivot: 'feet' },
  run: { frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3'], fps: 13, pivot: 'feet' },
  prepJump: { frames: ['crouch'], fps: 1, pivot: 'feet' },
  land: { frames: ['land'], fps: 1, pivot: 'feet' },
  jump: { frames: ['jump'], fps: 1, pivot: 'center' },
  fall: { frames: ['fly'], fps: 1, pivot: 'center' },
  reach: { frames: ['dive'], fps: 1, pivot: 'center' },
  release: { frames: ['leap'], fps: 1, pivot: 'center' },
  hang: { frames: ['jump'], fps: 1, pivot: 'top' },
  panic: { frames: ['fly', 'reachback'], fps: 7, pivot: 'center' },
  dead: { frames: ['fly'], fps: 1, pivot: 'center' },
  scream: { frames: ['jump'], fps: 1, pivot: 'feet' },
  chestBeat: { frames: ['crouch', 'land'], fps: 9, pivot: 'feet' },
  hug: { frames: ['walk_0'], fps: 1, pivot: 'feet' },
};

/** Estado da máquina → animação. */
const STATE_ANIM = {
  idle: 'idle', walk: 'walk', run: 'run', prepJump: 'prepJump', land: 'land',
  jump: 'jump', fall: 'fall', reach: 'reach', release: 'release',
  grab: 'hang', swing: 'hang', climbUp: 'hang', climbDown: 'hang',
  panic: 'panic', dead: 'dead', scream: 'scream', chestBeat: 'chestBeat', hug: 'hug',
};

/** Posição aproximada da cabeça (óculos) em cada quadro, normalizada — para o brilho dos olhos. */
const HEAD = {
  walk_0: [0.72, 0.16], walk_1: [0.72, 0.17], walk_2: [0.72, 0.17], walk_3: [0.74, 0.16],
  crouch: [0.74, 0.3], jump: [0.52, 0.21], fly: [0.72, 0.22], land: [0.8, 0.3], reachback: [0.62, 0.3],
  leap: [0.82, 0.2], dive: [0.62, 0.2], idle: [0.76, 0.3],
};

const TRAIL_LEN = 16;

export class Monkey {
  constructor(scene, sim, { quality = 'high' } = {}) {
    this.scene = scene;
    this.sim = sim;
    this.quality = quality;
    this.actor = new SpriteActor(scene, 'monkey', MONKEY_ANIMS, { depth: DEPTH.monkey });
    this.actor.play('idle');
    this.fsm = new MonkeyStateMachine('idle');
    this.scripted = false;
    this.offset = { x: 0, y: 0 };
    this.rotation = 0;
    this.renderPos = { x: sim.x, y: sim.y };
    this.mango = 0;
    this.stepTimer = 0;
    this.lastTheta = 0;
    this.screamed = false;
    this.zapTime = 0;
    this.pop = 0;
    this.time = 0;

    // luz ambiente suave atrás do personagem (legibilidade no cenário escuro)
    this.aura = scene.add.image(0, 0, 'glow').setDepth(DEPTH.monkey - 2).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffc890).setAlpha(0.2).setScale(1.9);
    this.trail = scene.add.graphics().setDepth(DEPTH.monkeyTrail).setBlendMode(Phaser.BlendModes.ADD);
    this.trailPts = [];
    this.eyeGlow = scene.add.image(0, 0, 'glow').setDepth(DEPTH.monkey + 0.5).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x7fe8ff).setScale(0.3).setVisible(false);
    this.sparks = scene.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 160 },
      lifespan: { min: 180, max: 420 },
      scale: { start: 0.45, end: 0 },
      tint: [0x7fe8ff, 0xffffff, 0xfff27a],
      blendMode: 'ADD',
      frequency: quality === 'low' ? 70 : 28,
      emitting: false,
    }).setDepth(DEPTH.effects);
  }

  /** Reage aos eventos da simulação (chamado pela cena). */
  onEvent(e) {
    switch (e.type) {
      case 'grab':
        // suaviza o encaixe no cipó (sem teletransporte visual)
        this.offset.x += e.dx;
        this.offset.y += e.dy;
        this.sim.prevX = this.sim.x;
        this.sim.prevY = this.sim.y;
        this.fsm.set('grab', { lock: 0.12, force: true });
        AudioManager.play('grab');
        this.screamed = false;
        break;
      case 'release':
        this.fsm.set('release', { lock: 0.18, force: true });
        AudioManager.play('release');
        break;
      case 'jump':
        AudioManager.play('jump');
        break;
      case 'land':
        this.fsm.set('land', { lock: 0.14, force: true });
        AudioManager.play('land');
        break;
      default:
        break;
    }
  }

  flashCollect() {
    this.pop = Math.max(this.pop, 0.12);
  }

  flashPowerUp(type) {
    this.pop = 0.25;
    if (type === 'mango') this.zapTime = 0.7; // recebendo eletricidade
  }

  setScripted(state, opts) {
    this.scripted = true;
    this.fsm.set(state, { force: true, ...opts });
  }

  /** Centro do corpo no mundo (para coleta de itens). */
  bodyCenter() {
    return collectibleBody(this.sim);
  }

  /** Centro do corpo no mundo, como desenhado (câmera e efeitos). */
  bodyWorld() {
    const c = this.actor.frameMeta().center;
    return this.actor.framePointToWorld(c.x, c.y);
  }

  resolveState(world) {
    const s = this.sim;
    if (this.scripted) return;
    if (s.mode === 'dead') { this.fsm.set('dead', { force: true }); return; }
    if (s.mode === 'ground') {
      if (s.jumpPrep >= 0) { this.fsm.set('prepJump', { force: true }); return; }
      const v = Math.abs(s.vx);
      this.fsm.set(v < 15 ? 'idle' : v > 250 ? 'run' : 'walk');
      return;
    }
    if (s.mode === 'vine') {
      if (s.rDot < -1) this.fsm.set('climbUp');
      else if (s.rDot > 1) this.fsm.set('climbDown');
      else this.fsm.set('swing');
      return;
    }
    const near = this.findReachableVine(world);
    this.reachAngle = near ? near.angle : null;
    if (s.vy > 700 && s.y > (world.supportY?.(s.x) ?? Infinity) + 180) {
      this.fsm.set('panic');
      if (!this.screamed) {
        this.screamed = true;
        AudioManager.play('fall');
      }
    } else if (near) this.fsm.set('reach');
    else if (s.vy < -60) this.fsm.set('jump');
    else this.fsm.set('fall');
  }

  findReachableVine(world) {
    const s = this.sim;
    let best = null;
    for (const v of world.vines) {
      if (Math.abs(v.ax - s.x) > 380) continue;
      if (v.id === s.lastVineId && s.regrabTimer > 0) continue;
      const p = projectOnVine(v, s.x, s.y);
      if (p.t < PHYS.VINE_MIN_R || p.t > v.length || p.dist > 150) continue;
      if (!best || p.dist < best.dist) {
        const cx = v.ax + Math.sin(v.theta) * p.t;
        const cy = v.ay + Math.cos(v.theta) * p.t;
        best = { dist: p.dist, angle: Math.atan2(cy - (s.y + 40), (cx - s.x) * (s.facing || 1)) };
      }
    }
    return best;
  }

  /**
   * @param dt     segundos reais do quadro
   * @param alpha  fração entre o último e o próximo passo de física (interpolação)
   */
  update(dt, alpha, world, input, mango = 0) {
    const s = this.sim;
    this.time += dt;
    this.mango = mango;
    this.resolveState(world);
    this.fsm.update(dt);

    const anim = STATE_ANIM[this.fsm.state] ?? 'idle';
    const a = this.actor;
    a.setFacing(s.facing || 1);
    a.play(anim);
    const speed = anim === 'run' && mango > 0.3 ? 1.5 : 1;
    a.update(dt, speed);

    // posição interpolada + decaimento suave do encaixe
    const k = Math.exp(-18 * dt);
    this.offset.x *= k;
    this.offset.y *= k;
    const x = Phaser.Math.Linear(s.prevX, s.x, alpha) + this.offset.x;
    const y = Phaser.Math.Linear(s.prevY, s.y, alpha) + this.offset.y;
    this.renderPos.x = x;
    this.renderPos.y = y;

    // ponto de ancoragem e rotação de acordo com o pivô da animação
    const facing = a.facing;
    let px = x;
    let py = y;
    let target = 0;
    if (a.pivot === 'feet') py = y + PHYS.GRAB_TO_FEET;
    else if (a.pivot === 'center') py = y + 60;
    if (a.pivot === 'top') {
      const theta = s.vine ? s.vine.theta : 0;
      target = facing * a.frameMeta().hangAngle - theta;
      if (this.fsm.state === 'climbUp' || this.fsm.state === 'climbDown') target += Math.sin(this.time * 14) * 0.06;
    } else if (anim === 'reach' && this.reachAngle != null) {
      target = Phaser.Math.Clamp(this.reachAngle, -0.7, 0.5) * facing * 0.6;
    } else if (anim === 'jump' || anim === 'fall' || anim === 'release') {
      target = Phaser.Math.Clamp(s.vy / 2400, -0.25, 0.3) * facing;
    }
    if (s.mode === 'dead' || anim === 'dead') this.rotation += dt * 5 * facing;
    else if (anim === 'panic') this.rotation = Math.sin(this.time * 10) * 0.35;
    else this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, target, (a.pivot === 'top' ? 16 : 7) * dt);

    // pequenos "pulos" de escala ao coletar itens e ao respirar parado
    this.pop = Math.max(0, this.pop - dt);
    const breathe = anim === 'idle' ? 1 + Math.sin(this.time * 2.4) * 0.015 : 1;
    const pop = 1 + this.pop * 0.9;
    let shake = 0;
    if (anim === 'scream' || anim === 'chestBeat') shake = Math.sin(this.time * 55) * 1.5;
    a.image.setScale(a.scale * pop, a.scale * pop * breathe);
    a.setPosition(px + shake, py).setRotation(this.rotation);

    this.updateEffects(dt);
    this.updateSounds(dt);
  }

  updateEffects(dt) {
    const a = this.actor;
    const c = a.frameMeta().center;
    const body = a.framePointToWorld(c.x, c.y);
    const m = this.mango;
    this.aura.setPosition(body.x, body.y).setTint(m > 0.1 ? 0x7fe8ff : 0xffc890).setAlpha(0.18 + 0.17 * m);
    // rastro elétrico
    this.trailPts.unshift({ x: body.x, y: body.y });
    if (this.trailPts.length > TRAIL_LEN) this.trailPts.pop();
    this.trail.clear();
    if (m > 0.05 && this.quality !== 'low') {
      for (let i = 1; i < this.trailPts.length; i++) {
        const p0 = this.trailPts[i - 1];
        const p1 = this.trailPts[i];
        const f = 1 - i / this.trailPts.length;
        const jit = (Math.random() - 0.5) * 10 * m;
        this.trail.lineStyle(18 * f * m, 0x3fc8ff, 0.22 * f * m);
        this.trail.lineBetween(p0.x, p0.y, p1.x + jit, p1.y + jit);
        this.trail.lineStyle(4 * f, 0xeaffff, 0.8 * f * m);
        this.trail.lineBetween(p0.x, p0.y, p1.x + jit, p1.y - jit);
      }
    }
    // descarga elétrica ao pegar a manga
    if (this.zapTime > 0) {
      this.zapTime -= dt;
      for (let i = 0; i < 4; i++) {
        let px = body.x;
        let py = body.y;
        const ang = Math.random() * Math.PI * 2;
        this.trail.lineStyle(2.5, 0xffffff, 0.95);
        this.trail.beginPath();
        this.trail.moveTo(px, py);
        for (let j = 0; j < 5; j++) {
          px += Math.cos(ang) * 16 + (Math.random() - 0.5) * 20;
          py += Math.sin(ang) * 16 + (Math.random() - 0.5) * 20;
          this.trail.lineTo(px, py);
        }
        this.trail.strokePath();
      }
    }
    this.sparks.setPosition(body.x, body.y);
    this.sparks.emitting = m > 0.2;
    // olhos brilhando como relâmpagos
    const hp = HEAD[a.frameName] ?? [0.7, 0.2];
    const head = a.framePointToWorld(hp[0], hp[1]);
    this.eyeGlow.setVisible(m > 0.05).setPosition(head.x, head.y).setAlpha(0.5 + 0.5 * m * (0.7 + 0.3 * Math.sin(this.time * 30)));
  }

  updateSounds(dt) {
    const s = this.sim;
    const st = this.fsm.state;
    if (st === 'walk' || st === 'run') {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        AudioManager.play('step');
        this.stepTimer = st === 'run' ? (this.mango > 0.3 ? 0.14 : 0.2) : 0.32;
      }
    }
    if (s.mode === 'vine' && s.vine) {
      const th = s.vine.theta;
      if (Math.sign(th) !== Math.sign(this.lastTheta) && Math.abs(s.vine.omega) > 1.4) {
        AudioManager.play('swing', { intensity: Math.min(1, Math.abs(s.vine.omega) / 3.5), minGap: 0.4 });
      }
      this.lastTheta = th;
    }
    if (this.mango > 0.5 && Math.random() < dt * 5) AudioManager.play('crackle', { minGap: 0.12 });
  }

  destroy() {
    this.actor.destroy();
    this.aura.destroy();
    this.trail.destroy();
    this.eyeGlow.destroy();
    this.sparks.destroy();
  }
}
