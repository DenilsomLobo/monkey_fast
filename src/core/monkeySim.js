/**
 * Simulação física do macaco (pura, determinística, passo fixo).
 *
 * O ponto (x, y) é o PONTO DE AGARRE (as mãos). O corpo é desenhado abaixo dele.
 * Modos: 'ground' (em um galho), 'air', 'vine', 'dead', 'scripted'.
 *
 * Cada passo pode gerar eventos em sim.events: jump, grab, release, land,
 * leaveGround, finish, dead. Quem consome (cena, testes, verificador) limpa a lista.
 */
import { PHYS, MANGO } from './constants.js';
import { projectOnVine, vinePoint, stepFreeVine, clamp } from './vinePhysics.js';

export function createMonkeySim(x, y, mode = 'ground', platformId = 0) {
  return {
    mode,
    x, y, vx: 0, vy: 0,
    prevX: x, prevY: y,
    facing: 1,
    platformId,
    vine: null,
    r: 0,
    rDot: 0,
    holdTime: 0,
    jumpPrep: -1,
    lastVineId: -1,
    regrabTimer: 0,
    airTime: 0,
    events: [],
  };
}

/**
 * @param sim     estado do macaco
 * @param input   { x: -1..1, y: -1..1 (negativo = cima), jumpPressed: bool }
 * @param world   { vines, platforms, killY(x) }
 * @param dt      passo fixo
 * @param mods    { mango: 0..1, vineTime: >=1 }
 */
export function stepWorld(sim, input, world, dt, mods = { mango: 0, vineTime: 1 }) {
  // 1) Cipós livres
  const vineTime = mods.vineTime ?? 1;
  for (const v of world.vines) {
    if (!v.occupied) stepFreeVine(v, dt, vineTime);
  }
  // 2) Macaco
  stepMonkey(sim, input, world, dt, mods);
}

export function stepMonkey(sim, input, world, dt, mods = { mango: 0, vineTime: 1 }) {
  sim.prevX = sim.x;
  sim.prevY = sim.y;
  if (sim.regrabTimer > 0) sim.regrabTimer -= dt;
  const mango = mods.mango ?? 0;

  switch (sim.mode) {
    case 'ground': stepGround(sim, input, world, dt, mango); break;
    case 'air': stepAir(sim, input, world, dt, mango); break;
    case 'vine': stepVine(sim, input, world, dt, mods); break;
    default: return;
  }

  if (sim.mode === 'air' && world.killY && sim.y > world.killY(sim.x)) {
    sim.mode = 'dead';
    sim.events.push({ type: 'dead' });
  }
}

const lerp = (a, b, t) => a + (b - a) * t;

function stepGround(sim, input, world, dt, mango) {
  const plat = world.platforms[sim.platformId];
  const dir = Math.abs(input.x) > 0.15 ? Math.sign(input.x) : 0;
  sim.holdTime = dir !== 0 && dir === Math.sign(sim.vx || dir) ? sim.holdTime + dt : 0;

  const running = Math.abs(input.x) > 0.85 && sim.holdTime > PHYS.RUN_AFTER;
  const base = running ? PHYS.RUN_SPEED : PHYS.WALK_SPEED * Math.min(1, Math.abs(input.x) / 0.85);
  const target = dir * base * lerp(1, MANGO.GROUND_SPEED, mango);

  if (dir !== 0) {
    sim.facing = dir;
    sim.vx = approach(sim.vx, target, PHYS.GROUND_ACCEL * dt);
  } else {
    sim.vx = approach(sim.vx, 0, PHYS.GROUND_FRICTION * dt);
  }
  sim.x += sim.vx * dt;
  sim.y = plat.y - PHYS.GRAB_TO_FEET;
  sim.vy = 0;

  if (sim.jumpPrep < 0 && input.jumpPressed) {
    sim.jumpPrep = PHYS.JUMP_PREP_TIME;
  }
  if (sim.jumpPrep >= 0) {
    sim.jumpPrep -= dt;
    if (sim.jumpPrep < 0) {
      sim.vy = -PHYS.JUMP_SPEED;
      sim.mode = 'air';
      sim.airTime = 0;
      sim.events.push({ type: 'jump' });
      return;
    }
  }

  if (sim.x < plat.x1 - PHYS.HALF_WIDTH || sim.x > plat.x2 + PHYS.HALF_WIDTH) {
    sim.mode = 'air';
    sim.airTime = 0;
    sim.jumpPrep = -1;
    sim.events.push({ type: 'leaveGround' });
  }
}

function stepAir(sim, input, world, dt, mango) {
  sim.airTime += dt;
  // Controle aéreo limitado: ajuda a corrigir, mas não cria impulso do nada
  const accel = PHYS.AIR_ACCEL * lerp(1, MANGO.AIR_ACCEL, mango) * dt;
  if (Math.abs(input.x) > 0.15) {
    const dir = Math.sign(input.x);
    if (dir === Math.sign(sim.vx) || sim.vx === 0) {
      if (Math.abs(sim.vx) < PHYS.AIR_CONTROL_MAX) {
        sim.vx = approach(sim.vx, dir * PHYS.AIR_CONTROL_MAX, accel);
      }
    } else {
      sim.vx = approach(sim.vx, 0, accel);
    }
  }
  sim.vy = Math.min(sim.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL_SPEED);
  sim.x += sim.vx * dt;
  sim.y += sim.vy * dt;
  if (Math.abs(sim.vx) > 30) sim.facing = Math.sign(sim.vx);

  // Pouso em galhos (só de cima para baixo)
  const prevFeet = sim.prevY + PHYS.GRAB_TO_FEET;
  const feet = sim.y + PHYS.GRAB_TO_FEET;
  if (sim.vy >= 0) {
    for (let i = 0; i < world.platforms.length; i++) {
      const p = world.platforms[i];
      if (prevFeet <= p.y + 0.5 && feet >= p.y && sim.x >= p.x1 - PHYS.HALF_WIDTH && sim.x <= p.x2 + PHYS.HALF_WIDTH) {
        sim.y = p.y - PHYS.GRAB_TO_FEET;
        sim.vy = 0;
        sim.mode = 'ground';
        sim.platformId = i;
        sim.jumpPrep = -1;
        sim.holdTime = 0;
        sim.events.push({ type: 'land', platform: i, final: !!p.final });
        if (p.final) {
          sim.events.push({ type: 'finish' });
        }
        return;
      }
    }
  }

  tryCapture(sim, world);
}

/** Procura um cipó ao alcance das mãos (teste por distância + teste de travessia). */
export function tryCapture(sim, world) {
  let best = null;
  let bestDist = Infinity;
  const vines = world.vines;
  const lo = lowerBound(vines, sim.x - 420);
  for (let i = lo; i < vines.length; i++) {
    const v = vines[i];
    if (v.ax > sim.x + 420) break;
    if (v.occupied) continue;
    if (v.id === sim.lastVineId && sim.regrabTimer > 0) continue;
    const now = projectOnVine(v, sim.x, sim.y);
    const tMax = v.length - PHYS.VINE_TIP_MARGIN;
    if (now.t < PHYS.VINE_MIN_R || now.t > tMax) continue;
    let hit = now.dist <= PHYS.CAPTURE_RADIUS;
    if (!hit) {
      // Atravessou o cipó entre um passo e outro? (evita "passar direto" em alta velocidade)
      const before = projectOnVine(v, sim.prevX, sim.prevY);
      hit = before.t >= PHYS.VINE_MIN_R && before.t <= tMax && Math.sign(before.cross) !== Math.sign(now.cross) && before.dist < 80;
    }
    if (hit && now.dist < bestDist) {
      best = { v, t: now.t };
      bestDist = now.dist;
    }
  }
  if (best) grabVine(sim, best.v, best.t);
  return !!best;
}

function grabVine(sim, v, t) {
  const oldX = sim.x;
  const oldY = sim.y;
  const r = clamp(t, PHYS.VINE_MIN_R, v.length - PHYS.VINE_TIP_MARGIN);
  const c = Math.cos(v.theta);
  const s = Math.sin(v.theta);
  // componente tangencial da velocidade do macaco vira velocidade angular
  const vt = sim.vx * c - sim.vy * s;
  const share = PHYS.GRAB_MOMENTUM_SHARE;
  v.omega = share * (vt / r) + (1 - share) * v.omega;
  v.omega = clamp(v.omega, -6, 6);
  v.occupied = true;
  sim.vine = v;
  sim.r = r;
  sim.rDot = 0;
  sim.mode = 'vine';
  const p = vinePoint(v, r);
  sim.x = p.x;
  sim.y = p.y;
  sim.events.push({ type: 'grab', vineId: v.id, dx: oldX - p.x, dy: oldY - p.y });
}

/** Um passo do balanço com o macaco agarrado. Exportado para o verificador de alcance. */
export function stepSwing(sim, v, inputX, inputY, dt, mods = { mango: 0, vineTime: 1 }) {
  const mango = mods.mango ?? 0;
  const vineTime = mods.vineTime ?? 1;
  const g = PHYS.GRAVITY * vineTime * vineTime;

  // Subir / descer pelo cipó
  const climb = PHYS.CLIMB_SPEED * lerp(1, MANGO.CLIMB, mango);
  let rDot = Math.abs(inputY) > 0.3 ? Math.sign(inputY) * climb : 0;
  const rMin = PHYS.VINE_MIN_R;
  const rMax = v.length - PHYS.VINE_TIP_MARGIN;
  if ((sim.r <= rMin && rDot < 0) || (sim.r >= rMax && rDot > 0)) rDot = 0;
  sim.rDot = rDot;

  const pump = Math.abs(inputX) > 0.15 ? Math.sign(inputX) * PHYS.PUMP_ACCEL * lerp(1, MANGO.PUMP, mango) : 0;
  const r = sim.r;
  let alpha = -(g / r) * Math.sin(v.theta) - (2 * rDot * v.omega) / r + pump / r - PHYS.SWING_DAMPING * v.omega;

  // Limite suave de amplitude
  if (Math.abs(v.theta) > PHYS.MAX_SWING_ANGLE && v.theta * v.omega > 0) {
    alpha -= Math.sign(v.theta) * (Math.abs(v.theta) - PHYS.MAX_SWING_ANGLE) * 60;
    v.omega *= Math.exp(-10 * dt);
  }
  v.omega += alpha * dt;
  v.theta += v.omega * dt;
  if (Math.abs(v.theta) > PHYS.HARD_SWING_ANGLE) {
    v.theta = Math.sign(v.theta) * PHYS.HARD_SWING_ANGLE;
    v.omega = 0;
  }
  sim.r = clamp(r + rDot * dt, rMin, rMax);

  const p = vinePoint(v, sim.r);
  sim.x = p.x;
  sim.y = p.y;
  const c = Math.cos(v.theta);
  const s = Math.sin(v.theta);
  sim.vx = sim.r * v.omega * c + rDot * s;
  sim.vy = -sim.r * v.omega * s + rDot * c;
}

function stepVine(sim, input, world, dt, mods) {
  const v = sim.vine;
  stepSwing(sim, v, input.x, input.y, dt, mods);
  if (Math.abs(v.omega) > 0.25) sim.facing = Math.sign(v.omega);
  else if (Math.abs(input.x) > 0.15) sim.facing = Math.sign(input.x);

  if (input.jumpPressed) releaseVine(sim, mods);
}

export function releaseVine(sim, mods = { mango: 0 }) {
  const v = sim.vine;
  if (!v) return;
  const boost = PHYS.RELEASE_BOOST * lerp(1, MANGO.RELEASE_BOOST, mods.mango ?? 0);
  sim.vx *= boost;
  sim.vy = sim.vy * boost - PHYS.RELEASE_UP_KICK;
  // O cipó continua balançando com a mesma velocidade angular
  v.omega = clamp(v.omega, -6, 6);
  v.occupied = false;
  sim.lastVineId = v.id;
  sim.regrabTimer = PHYS.REGRAB_COOLDOWN;
  sim.vine = null;
  sim.mode = 'air';
  sim.airTime = 0;
  sim.events.push({ type: 'release', vineId: v.id });
}

function approach(v, target, step) {
  if (v < target) return Math.min(v + step, target);
  if (v > target) return Math.max(v - step, target);
  return v;
}

/** Primeiro índice com ax >= x (vines ordenados por ax). */
export function lowerBound(vines, x) {
  let lo = 0;
  let hi = vines.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (vines[mid].ax < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
