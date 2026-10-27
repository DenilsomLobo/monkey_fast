/**
 * Máquina de estados de animação: evita conflitos entre animações.
 * Estados transitórios (agarrar, soltar, aterrissar) usam "lock" para tocar até o fim.
 * Sobreposições rápidas (coletar item, power-up) usam flash().
 */
export class MonkeyStateMachine {
  constructor(initial = 'idle') {
    this.state = initial;
    this.time = 0;
    this.lock = 0;
    this.overlay = null;
    this.overlayTime = 0;
  }

  set(state, { lock = 0, force = false } = {}) {
    if (!force && this.lock > 0 && state !== this.state) return false;
    if (state !== this.state) {
      this.state = state;
      this.time = 0;
    }
    if (lock) this.lock = lock;
    return true;
  }

  flash(overlay, duration) {
    this.overlay = overlay;
    this.overlayTime = duration;
  }

  update(dt) {
    this.time += dt;
    if (this.lock > 0) this.lock = Math.max(0, this.lock - dt);
    if (this.overlayTime > 0) {
      this.overlayTime -= dt;
      if (this.overlayTime <= 0) this.overlay = null;
    }
  }
}
