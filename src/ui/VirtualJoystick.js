/**
 * Controles virtuais (celular/tablet): joystick analógico à esquerda,
 * botão de salto à direita. Suporta vários toques ao mesmo tempo
 * (Pointer Events com pointerId) e não deixa a página rolar.
 */
import { h } from './dom.js';

export class VirtualJoystick {
  constructor(root, { onJump } = {}) {
    this.value = { x: 0, y: 0 };
    this.pointerId = null;
    this.onJump = onJump;

    this.knob = h('div', { class: 'knob' });
    this.base = h('div', { class: 'joystick', 'aria-label': 'Joystick' }, [this.knob]);
    this.jumpBtn = h('button', { class: 'jump-btn', 'aria-label': 'Pular' }, 'PULAR');
    this.el = h('div', { class: 'touch passthrough' }, [this.base, this.jumpBtn]);
    root.appendChild(this.el);

    const opts = { passive: false };
    this.base.addEventListener('pointerdown', (e) => this.start(e), opts);
    window.addEventListener('pointermove', (this.onMove = (e) => this.move(e)), opts);
    window.addEventListener('pointerup', (this.onUp = (e) => this.end(e)), opts);
    window.addEventListener('pointercancel', this.onUp, opts);

    this.jumpBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.jumpBtn.classList.add('active');
      this.onJump?.();
      navigator.vibrate?.(8);
    }, opts);
    const release = (e) => { e.preventDefault(); this.jumpBtn.classList.remove('active'); };
    this.jumpBtn.addEventListener('pointerup', release, opts);
    this.jumpBtn.addEventListener('pointercancel', release, opts);
    this.jumpBtn.addEventListener('pointerleave', release, opts);
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  start(e) {
    e.preventDefault();
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.base.setPointerCapture?.(e.pointerId);
    this.base.classList.add('active');
    this.move(e);
  }

  move(e) {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const r = this.base.getBoundingClientRect();
    const radius = r.width / 2;
    let dx = (e.clientX - (r.left + radius)) / radius;
    let dy = (e.clientY - (r.top + radius)) / radius;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    // zona morta
    const dead = 0.18;
    const mag = Math.hypot(dx, dy);
    const k = mag < dead ? 0 : (mag - dead) / (1 - dead) / (mag || 1);
    this.value.x = dx * k;
    this.value.y = dy * k;
    this.knob.style.transform = `translate(calc(-50% + ${dx * radius * 0.6}px), calc(-50% + ${dy * radius * 0.6}px))`;
  }

  end(e) {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.value.x = 0;
    this.value.y = 0;
    this.base.classList.remove('active');
    this.knob.style.transform = 'translate(-50%, -50%)';
  }

  setVisible(v) {
    this.el.style.display = v ? '' : 'none';
  }

  destroy() {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.el.remove();
  }
}
