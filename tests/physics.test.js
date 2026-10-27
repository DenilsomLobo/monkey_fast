import { describe, it, expect } from 'vitest';
import { createVine, stepFreeVine } from '../src/core/vinePhysics.js';
import { createMonkeySim, stepWorld, stepMonkey } from '../src/core/monkeySim.js';
import { FIXED_DT, PHYS } from '../src/core/constants.js';

const NO_INPUT = { x: 0, y: 0, jumpPressed: false };

function runFrames(frameDt, seconds, vine) {
  // mesma lógica de acumulador usada na GameScene
  let acc = 0;
  for (let t = 0; t < seconds; t += frameDt) {
    acc += frameDt;
    while (acc >= FIXED_DT - 1e-12) { stepFreeVine(vine, FIXED_DT); acc -= FIXED_DT; }
  }
  return vine;
}

function stillVine(props) {
  const v = createVine({ id: 0, ax: 0, ay: 0, length: 250, amp: 0.01, ...props });
  v.theta = 0;
  v.omega = 0;
  return v;
}

describe('física dos cipós', () => {
  it('cipó livre mantém a amplitude alvo', () => {
    const v = createVine({ id: 0, ax: 0, ay: 0, length: 240, amp: 0.5, phase: 0.3 });
    let maxAbs = 0;
    for (let i = 0; i < 120 * 20; i++) {
      stepFreeVine(v, FIXED_DT);
      if (i > 120 * 10) maxAbs = Math.max(maxAbs, Math.abs(v.theta));
    }
    expect(maxAbs).toBeGreaterThan(0.45);
    expect(maxAbs).toBeLessThan(0.55);
  });

  it('volta ao balanço natural depois de perturbado', () => {
    const v = createVine({ id: 0, ax: 0, ay: 0, length: 240, amp: 0.4 });
    v.omega = 5;
    let maxAbs = 0;
    for (let i = 0; i < 120 * 25; i++) {
      stepFreeVine(v, FIXED_DT);
      if (i > 120 * 18) maxAbs = Math.max(maxAbs, Math.abs(v.theta));
    }
    expect(maxAbs).toBeLessThan(0.48);
  });

  it('resultado independe do FPS (30, 60 e 144)', () => {
    const mk = () => createVine({ id: 0, ax: 0, ay: 0, length: 220, amp: 0.45, phase: 1 });
    const a = runFrames(1 / 30, 3, mk());
    const b = runFrames(1 / 60, 3, mk());
    const c = runFrames(1 / 144, 3, mk());
    expect(Math.abs(a.theta - b.theta)).toBeLessThan(0.03);
    expect(Math.abs(b.theta - c.theta)).toBeLessThan(0.03);
  });
});

describe('macaco', () => {
  const platforms = [{ x1: -500, x2: 100, y: 300 }];

  it('agarra o cipó ao passar perto, sem teletransporte', () => {
    const v = stillVine({ ax: 300 });
    const sim = createMonkeySim(200, 150, 'air');
    sim.vx = 600;
    const world = { vines: [v], platforms, killY: () => 5000 };
    let grab = null;
    for (let i = 0; i < 120 && !grab; i++) {
      stepWorld(sim, NO_INPUT, world, FIXED_DT);
      grab = sim.events.find((e) => e.type === 'grab');
    }
    expect(grab).toBeTruthy();
    expect(Math.hypot(grab.dx, grab.dy)).toBeLessThanOrEqual(PHYS.CAPTURE_RADIUS + 1);
    expect(sim.mode).toBe('vine');
  });

  it('não atravessa o cipó em alta velocidade', () => {
    const v = stillVine({ ax: 300 });
    const sim = createMonkeySim(100, 150, 'air');
    sim.vx = 1500;
    const world = { vines: [v], platforms, killY: () => 5000 };
    for (let i = 0; i < 60 && sim.mode === 'air'; i++) stepWorld(sim, NO_INPUT, world, FIXED_DT);
    expect(sim.mode).toBe('vine');
  });

  it('o impulso do balanço é preservado ao soltar', () => {
    const v = stillVine({});
    const sim = createMonkeySim(0, 200, 'air');
    const world = { vines: [v], platforms: [], killY: () => 5000 };
    stepWorld(sim, NO_INPUT, world, FIXED_DT);
    expect(sim.mode).toBe('vine');
    v.omega = 2;
    stepWorld(sim, NO_INPUT, world, FIXED_DT);
    const speedBefore = Math.hypot(sim.vx, sim.vy);
    stepWorld(sim, { x: 0, y: 0, jumpPressed: true }, world, FIXED_DT);
    expect(sim.mode).toBe('air');
    expect(sim.vx).toBeGreaterThan(speedBefore * 0.9);
  });

  it('não reagarra o mesmo cipó imediatamente', () => {
    const v = stillVine({});
    const sim = createMonkeySim(0, 200, 'air');
    const world = { vines: [v], platforms: [], killY: () => 5000 };
    stepWorld(sim, NO_INPUT, world, FIXED_DT);
    stepWorld(sim, { x: 0, y: 0, jumpPressed: true }, world, FIXED_DT);
    for (let i = 0; i < 20; i++) {
      stepWorld(sim, NO_INPUT, world, FIXED_DT);
      expect(sim.mode).toBe('air');
    }
  });

  it('sem chão invisível: cair no vazio termina em morte', () => {
    const sim = createMonkeySim(0, 0, 'air');
    const world = { vines: [], platforms: [], killY: () => 800 };
    for (let i = 0; i < 400 && sim.mode !== 'dead'; i++) stepMonkey(sim, NO_INPUT, world, FIXED_DT);
    expect(sim.mode).toBe('dead');
  });

  it('sobe e desce pelo cipó dentro dos limites', () => {
    const v = stillVine({});
    const sim = createMonkeySim(0, 200, 'air');
    const world = { vines: [v], platforms: [], killY: () => 5000 };
    stepWorld(sim, NO_INPUT, world, FIXED_DT);
    for (let i = 0; i < 400; i++) stepWorld(sim, { x: 0, y: -1, jumpPressed: false }, world, FIXED_DT);
    expect(sim.r).toBeCloseTo(PHYS.VINE_MIN_R, 3);
    for (let i = 0; i < 400; i++) stepWorld(sim, { x: 0, y: 1, jumpPressed: false }, world, FIXED_DT);
    expect(sim.r).toBeCloseTo(250 - PHYS.VINE_TIP_MARGIN, 3);
  });

  it('anda, corre e pula no galho', () => {
    const sim = createMonkeySim(-400, 300 - PHYS.GRAB_TO_FEET, 'ground', 0);
    const world = { vines: [], platforms, killY: () => 5000 };
    for (let i = 0; i < 120; i++) stepMonkey(sim, { x: 1, y: 0, jumpPressed: false }, world, FIXED_DT);
    expect(sim.vx).toBeCloseTo(PHYS.RUN_SPEED, 0);
    stepMonkey(sim, { x: 1, y: 0, jumpPressed: true }, world, FIXED_DT);
    for (let i = 0; i < 20; i++) stepMonkey(sim, NO_INPUT, world, FIXED_DT);
    expect(sim.mode).toBe('air');
    expect(sim.vy).toBeLessThan(0);
  });
});
