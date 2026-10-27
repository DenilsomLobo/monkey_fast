/**
 * Pontuação da partida: bananas, power-ups, tempo e registro de eventos
 * (enviado ao servidor do ranking para checagens de plausibilidade).
 */
import { computeScore } from '../core/scoring.js';

export class ScoreSystem {
  constructor(level) {
    this.totalBananas = level.bananas.length;
    this.totalPowerups = level.powerups.length;
    this.bananaIds = [];
    this.powerupIds = [];
    this.events = [];
    this.timeMs = 0;
  }

  get bananas() { return this.bananaIds.length; }
  get powerups() { return this.powerupIds.length; }

  tick(dtSeconds) {
    this.timeMs += dtSeconds * 1000;
  }

  addBanana(id) {
    this.bananaIds.push(id);
    this.log('c', id);
  }

  addPowerUp(id) {
    this.powerupIds.push(id);
    this.log('c', id);
  }

  grab(vineId) {
    this.log('g', vineId);
  }

  log(k, id) {
    if (this.events.length < 2000) this.events.push({ t: Math.round(this.timeMs), k, id });
  }

  /** Pontuação atual (sem bônus) — mostrada no HUD. */
  get current() {
    return this.bananas + this.powerups;
  }

  final() {
    return computeScore({
      bananas: this.bananas,
      powerups: this.powerups,
      totalBananas: this.totalBananas,
      totalPowerups: this.totalPowerups,
    });
  }
}
