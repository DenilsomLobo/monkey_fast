/**
 * Física pendular dos cipós.
 *
 * Um cipó é tratado como um pêndulo rígido preso no ponto de ancoragem (ax, ay).
 * Ângulo θ = 0 → pendurado reto para baixo; θ > 0 → balançando para a direita.
 *
 * - Cipó LIVRE: oscila sozinho. Um regulador de energia mantém a amplitude
 *   alvo (amp) — se algo o perturbar (ex.: o macaco soltou), ele volta
 *   suavemente ao balanço natural, sem saltos de ângulo.
 * - Cipó OCUPADO: quem integra é o macaco (ver monkeySim.stepSwing), usando
 *   o raio real em que ele está agarrado.
 */
import { PHYS } from './constants.js';

export function createVine({ id, ax, ay, length, amp, speed = 1, phase = 0, section = 1 }) {
  const vine = {
    id, ax, ay, length, amp, speed, section,
    theta: 0,
    omega: 0,
    occupied: false,
  };
  // Estado inicial consistente com a energia alvo (sem "tranco" no começo)
  const w2 = freeOmega0Sq(vine, 1);
  vine.theta = amp * Math.sin(phase);
  const e = Math.max(0, w2 * (Math.cos(vine.theta) - Math.cos(amp)));
  vine.omega = Math.sqrt(2 * e) * (Math.cos(phase) >= 0 ? 1 : -1);
  return vine;
}

/** ω0² do cipó livre. timeScale > 1 acelera a oscilação (Goiaba Mágica). */
export function freeOmega0Sq(vine, timeScale = 1) {
  const s = vine.speed * timeScale;
  return (PHYS.VINE_GRAVITY * s * s) / (vine.length * PHYS.VINE_COM_FACTOR);
}

/** Período natural aproximado do cipó livre (s). */
export function freePeriod(vine, timeScale = 1) {
  return (2 * Math.PI) / Math.sqrt(freeOmega0Sq(vine, timeScale));
}

/** Integra um passo do cipó livre (Euler semi-implícito, passo fixo). */
export function stepFreeVine(vine, dt, timeScale = 1) {
  const w2 = freeOmega0Sq(vine, timeScale);
  const c = Math.cos(vine.theta);
  const energy = 0.5 * vine.omega * vine.omega + w2 * (1 - c);
  const target = w2 * (1 - Math.cos(vine.amp));
  const reg = PHYS.VINE_REGULATION * timeScale * (1 - energy / Math.max(target, 1e-6));
  const alpha = -w2 * Math.sin(vine.theta) + reg * vine.omega;
  vine.omega += alpha * dt;
  // Proteção contra ângulos absurdos
  vine.omega = clamp(vine.omega, -12, 12);
  vine.theta += vine.omega * dt;
}

/** Ponto do cipó a uma distância r da ancoragem. */
export function vinePoint(vine, r, theta = vine.theta) {
  return { x: vine.ax + r * Math.sin(theta), y: vine.ay + r * Math.cos(theta) };
}

/**
 * Projeção de um ponto sobre a reta do cipó.
 * t = distância ao longo do cipó, dist = distância perpendicular,
 * cross = lado (sinal) — usado para detectar quando o macaco "atravessa" o cipó.
 */
export function projectOnVine(vine, px, py, theta = vine.theta) {
  const dx = px - vine.ax;
  const dy = py - vine.ay;
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const t = dx * s + dy * c;
  const cross = dx * c - dy * s;
  return { t, cross, dist: Math.abs(cross) };
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}
