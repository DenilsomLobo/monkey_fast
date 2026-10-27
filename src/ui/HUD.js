/**
 * HUD em HTML (nítido em qualquer resolução): nome, pontos, bananas,
 * cronômetro, power-ups ativos com contagem regressiva, progresso e pausa.
 * Fica nas bordas para não cobrir os cipós.
 */
import { h } from './dom.js';
import { formatTime } from '../core/scoring.js';
import { POWERUP_DURATION } from '../core/constants.js';

const RING = 2 * Math.PI * 23;

export class HUD {
  constructor(root, { name, totalBananas, onPause }) {
    this.cache = {};
    this.score = h('span', { class: 'score' }, '0');
    this.bananas = h('span', {}, `0/${totalBananas}`);
    this.timer = h('span', {}, '00:00.00');
    this.fill = h('div', { class: 'fill' });
    this.dot = h('div', { class: 'dot' });
    this.pus = h('div', { class: 'powerups' });
    this.puEls = {};
    this.totalBananas = totalBananas;

    this.el = h('div', { class: 'hud' }, [
      h('div', { class: 'hud-top' }, [
        h('div', { class: 'hud-left' }, [
          h('span', { class: 'hud-chip name', title: 'Jogador' }, `🐒 ${name}`),
          h('span', { class: 'hud-chip', title: 'Pontos' }, ['⭐ ', this.score]),
          h('span', { class: 'hud-chip', title: 'Bananas' }, [h('img', { src: '/assets/collectibles/banana.png', alt: '' }), this.bananas]),
        ]),
        h('div', { class: 'hud-right' }, [
          h('span', { class: 'hud-chip', title: 'Tempo' }, ['⏱ ', this.timer]),
          h('button', { class: 'btn ghost pause-btn', 'aria-label': 'Pausar', onclick: onPause }, '❚❚'),
        ]),
      ]),
      h('div', { class: 'progress', title: 'Progresso da fase' }, [this.fill, this.dot, h('span', { class: 'goal' }, '❤️')]),
      this.pus,
    ]);
    root.appendChild(this.el);
  }

  set(key, el, value) {
    if (this.cache[key] === value) return false;
    this.cache[key] = value;
    el.textContent = value;
    return true;
  }

  update({ score, bananas, timeMs, progress, timers }) {
    if (this.set('score', this.score, String(score))) {
      this.score.classList.remove('bump');
      void this.score.offsetWidth;
      this.score.classList.add('bump');
    }
    this.set('bananas', this.bananas, `${bananas}/${this.totalBananas}`);
    this.set('timer', this.timer, formatTime(timeMs));
    const pct = `${Math.round(Math.min(1, Math.max(0, progress)) * 1000) / 10}%`;
    if (this.cache.pct !== pct) {
      this.cache.pct = pct;
      this.fill.style.width = pct;
      this.dot.style.left = pct;
    }
    for (const type of ['mango', 'guava']) {
      const rem = timers.remaining(type);
      let el = this.puEls[type];
      if (rem > 0 && !el) el = this.puEls[type] = this.makePU(type);
      if (!el) continue;
      if (rem <= 0) {
        el.root.remove();
        delete this.puEls[type];
        continue;
      }
      el.circle.setAttribute('stroke-dashoffset', String(RING * (1 - rem / POWERUP_DURATION)));
      el.secs.textContent = `${Math.ceil(rem)}s`;
    }
  }

  makePU(type) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 52 52');
    const bg = document.createElementNS(ns, 'circle');
    const circle = document.createElementNS(ns, 'circle');
    for (const c of [bg, circle]) {
      c.setAttribute('cx', '26');
      c.setAttribute('cy', '26');
      c.setAttribute('r', '23');
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke-width', '4');
      svg.appendChild(c);
    }
    bg.setAttribute('stroke', 'rgba(255,255,255,0.15)');
    circle.setAttribute('stroke', type === 'mango' ? '#ff4fd8' : '#4dff7a');
    circle.setAttribute('stroke-linecap', 'round');
    circle.setAttribute('stroke-dasharray', String(RING));
    const secs = h('span', { class: 'secs' }, '7s');
    const root = h('div', { class: `pu ${type}`, title: type === 'mango' ? 'Manga Mágica' : 'Goiaba Mágica' }, [
      svg,
      h('img', { src: `/assets/collectibles/${type === 'mango' ? 'manga' : 'goiaba'}.png`, alt: '' }),
      secs,
    ]);
    this.pus.appendChild(root);
    return { root, circle, secs };
  }

  destroy() {
    this.el.remove();
  }
}
