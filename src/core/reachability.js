/**
 * Verificador de alcance entre cipós.
 *
 * Usa a MESMA física do jogo (stepSwing + voo balístico) para responder:
 * "existe um jeito de soltar deste cipó e agarrar o próximo?"
 *
 * Para cada configuração (raio em que o macaco segura × amplitude do balanço),
 * simula meio ciclo de balanço e testa a soltura em cada instante. O voo é
 * comparado com o SETOR varrido pelo cipó-alvo (todas as posições que ele ocupa
 * no seu balanço natural) — o jogador escolhe o momento em que o alvo passa ali.
 *
 * "Janela" = maior intervalo contínuo de tempo em que soltar dá certo.
 * Quanto menor a janela exigida, mais difícil o salto.
 */
import { PHYS } from './constants.js';
import { stepSwing } from './monkeySim.js';

const DT = 1 / 120;
const RELEASE_STRIDE = 2; // testa soltura a cada 2 passos (1/60 s)
const MAX_FLIGHT = 1.7;
const PATH_SAMPLE = 3;

/** Estados de soltura ao longo de meio balanço, da esquerda para a direita. */
export function swingReleaseStates(vine, r, amp) {
  const v = { ax: vine.ax, ay: vine.ay, length: vine.length, theta: -amp, omega: 0 };
  const sim = { r, rDot: 0, x: 0, y: 0, vx: 0, vy: 0 };
  const out = [];
  let started = false;
  for (let i = 0; i < 600; i++) {
    stepSwing(sim, v, 0, 0, DT);
    if (v.omega > 0.05) started = true;
    if (started && v.omega <= 0) break;
    if (i % RELEASE_STRIDE === 0 && v.omega > 0) {
      out.push({
        x: sim.x,
        y: sim.y,
        vx: sim.vx * PHYS.RELEASE_BOOST,
        vy: sim.vy * PHYS.RELEASE_BOOST - PHYS.RELEASE_UP_KICK,
        theta: v.theta,
      });
    }
  }
  return out;
}

/** Simula o voo e verifica se atinge o alvo. Retorna { hit, path, hitIndex }. */
export function simulateFlight(start, target, keepPath = false) {
  let { x, y, vx, vy } = start;
  const path = keepPath ? [{ x, y }] : null;
  const maxY = targetBottom(target) + 260;
  for (let i = 1; i * DT < MAX_FLIGHT; i++) {
    const py = y;
    vy = Math.min(vy + PHYS.GRAVITY * DT, PHYS.MAX_FALL_SPEED);
    x += vx * DT;
    y += vy * DT;
    if (keepPath && i % PATH_SAMPLE === 0) path.push({ x, y });
    if (hitsTarget(target, x, y, py, vy)) {
      if (keepPath) path.push({ x, y });
      return { hit: true, path, end: { x, y } };
    }
    if (y > maxY) break;
  }
  return { hit: false, path };
}

function targetBottom(target) {
  if (target.type === 'vine') return target.vine.ay + target.vine.length;
  return target.platform.y;
}

function hitsTarget(target, x, y, prevY, vy) {
  if (target.type === 'vine') {
    const v = target.vine;
    const dx = x - v.ax;
    const dy = y - v.ay;
    const d = Math.hypot(dx, dy);
    if (d < PHYS.VINE_MIN_R + 8 || d > v.length - PHYS.VINE_TIP_MARGIN - 4) return false;
    const phi = Math.atan2(dx, dy);
    return Math.abs(phi) <= v.amp * 0.95;
  }
  const p = target.platform;
  const feet = y + PHYS.GRAB_TO_FEET;
  const prevFeet = prevY + PHYS.GRAB_TO_FEET;
  return vy >= 0 && prevFeet <= p.y && feet >= p.y && x >= p.x1 + 10 && x <= p.x2;
}

/** Configurações de balanço testadas para um cipó de origem. */
function swingConfigs(vine, maxAmp) {
  const L = vine.length - PHYS.VINE_TIP_MARGIN;
  const radii = [L, L * 0.78, Math.max(PHYS.VINE_MIN_R + 30, L * 0.55)];
  const amps = [0.5, 0.7, 0.9, 1.05, 1.2].filter((a) => a <= maxAmp + 1e-9);
  const out = [];
  for (const r of radii) for (const amp of amps) out.push({ r, amp });
  return out;
}

/** Estados de salto a partir de um galho (correndo até a borda). */
function platformJumpStates(platform) {
  const out = [];
  const y = platform.y - PHYS.GRAB_TO_FEET;
  for (let x = platform.x2 - 160; x <= platform.x2 + PHYS.HALF_WIDTH; x += PHYS.RUN_SPEED / 60) {
    out.push({ x, y, vx: PHYS.RUN_SPEED, vy: -PHYS.JUMP_SPEED });
  }
  return out;
}

/**
 * Avalia um salto. from: {type:'vine', vine} | {type:'platform', platform}
 * Retorna { ok, window, paths } — paths são trajetórias válidas (para posicionar itens).
 */
export function evaluateJump(from, target, { maxAmp = 1.2, keepPaths = true } = {}) {
  const groups = [];
  if (from.type === 'platform') {
    groups.push({ config: { platform: true }, states: platformJumpStates(from.platform), stepTime: 1 / 60 });
  } else {
    for (const cfg of swingConfigs(from.vine, maxAmp)) {
      groups.push({ config: cfg, states: swingReleaseStates(from.vine, cfg.r, cfg.amp), stepTime: RELEASE_STRIDE * DT });
    }
  }

  let bestWindow = 0;
  const paths = [];
  for (const g of groups) {
    let run = 0;
    let runStart = -1;
    let bestRun = 0;
    let bestRunStart = -1;
    const hits = g.states.map((s) => simulateFlight(s, target, false).hit);
    for (let i = 0; i < hits.length; i++) {
      if (hits[i]) {
        if (run === 0) runStart = i;
        run++;
        if (run > bestRun) { bestRun = run; bestRunStart = runStart; }
      } else run = 0;
    }
    const w = bestRun * g.stepTime;
    if (w > bestWindow) bestWindow = w;
    if (keepPaths && bestRun > 0) {
      // trajetória do meio da janela = salto "bem executado"
      const mid = g.states[bestRunStart + Math.floor(bestRun / 2)];
      const f = simulateFlight(mid, target, true);
      if (f.hit) paths.push({ window: w, config: g.config, path: f.path });
    }
  }
  paths.sort((a, b) => b.window - a.window);
  return { ok: bestWindow > 0, window: bestWindow, paths };
}
