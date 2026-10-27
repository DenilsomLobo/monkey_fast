/**
 * Temporizadores dos power-ups (lógica pura, testável).
 *
 * - Cada efeito dura exatamente POWERUP_DURATION segundos de jogo.
 * - Coletar o mesmo tipo de novo reinicia o tempo (não acumula).
 * - level(type) sobe de 0→1 e desce 1→0 em POWERUP_RAMP segundos: as mudanças
 *   de velocidade nunca são instantâneas.
 * - Manga e goiaba podem estar ativas juntas; a música acelera 2X uma única vez.
 */
import { POWERUP_DURATION, POWERUP_RAMP } from './constants.js';

export const POWERUP_TYPES = ['mango', 'guava'];

export class PowerUpTimers {
  constructor(duration = POWERUP_DURATION, ramp = POWERUP_RAMP) {
    this.duration = duration;
    this.ramp = ramp;
    this.state = {};
    for (const t of POWERUP_TYPES) this.state[t] = { remaining: 0, level: 0 };
  }

  activate(type) {
    const s = this.state[type];
    if (!s) throw new Error(`Power-up desconhecido: ${type}`);
    s.remaining = this.duration;
  }

  /** Avança o tempo; devolve a lista de tipos que acabaram de expirar. */
  update(dt) {
    const expired = [];
    for (const t of POWERUP_TYPES) {
      const s = this.state[t];
      if (s.remaining > 0) {
        s.remaining = Math.max(0, s.remaining - dt);
        if (s.remaining === 0) expired.push(t);
      }
      const target = s.remaining > 0 ? 1 : 0;
      const step = dt / this.ramp;
      s.level = target > s.level ? Math.min(target, s.level + step) : Math.max(target, s.level - step);
    }
    return expired;
  }

  isActive(type) { return this.state[type].remaining > 0; }
  remaining(type) { return this.state[type].remaining; }
  level(type) { return this.state[type].level; }
  anyActive() { return POWERUP_TYPES.some((t) => this.isActive(t)); }
  /** Velocidade da música: 2X se qualquer power-up estiver ativo (nunca 4X). */
  musicRate() { return this.anyActive() ? 2 : 1; }
  reset() { for (const t of POWERUP_TYPES) this.state[t] = { remaining: 0, level: 0 }; }
}
