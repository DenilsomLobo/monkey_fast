import { describe, it, expect } from 'vitest';
import { buildLevel, makeKillY } from '../src/core/levelGenerator.js';
import { createMonkeySim, stepWorld } from '../src/core/monkeySim.js';
import { createAutoPilot } from '../src/core/autoPilot.js';
import { FIXED_DT, PHYS } from '../src/core/constants.js';

/** Um "robô" joga a fase inteira com a física real do jogo. */
export function playThrough(seed, mods = { mango: 0, vineTime: 1 }) {
  const level = buildLevel(seed);
  const world = { vines: level.vines, platforms: level.platforms, killY: makeKillY(level) };
  const start = level.platforms[0];
  const sim = createMonkeySim(start.x1 + 200, start.y - PHYS.GRAB_TO_FEET, 'ground', 0);
  const pilot = createAutoPilot(world);
  let maxVine = -1;
  let t = 0;
  for (; t < 900; t += FIXED_DT) {
    const input = pilot.decide(sim, mods);
    stepWorld(sim, input, world, FIXED_DT, mods);
    for (const e of sim.events) {
      if (e.type === 'grab') maxVine = Math.max(maxVine, e.vineId);
      if (e.type === 'finish') return { finished: true, t, maxVine, vines: level.vines.length };
      if (e.type === 'dead') return { finished: false, dead: true, t, maxVine, vines: level.vines.length };
    }
    sim.events.length = 0;
  }
  return { finished: false, timeout: true, t, maxVine };
}

describe('travessia completa', () => {
  it('é possível atravessar a fase inteira, do galho inicial ao galho final', () => {
    const r = playThrough(2026);
    expect(r).toMatchObject({ finished: true });
    expect(r.maxVine).toBeGreaterThanOrEqual(r.vines - 2);
    console.log(`robô terminou em ${r.t.toFixed(1)} s de jogo`);
  }, 120000);

  it('também é possível com a Goiaba Mágica ativa (cipós rápidos)', () => {
    const r = playThrough(2026, { mango: 0, vineTime: 1.45 });
    expect(r).toMatchObject({ finished: true });
  }, 120000);

  it('também é possível com a Manga Mágica ativa', () => {
    const r = playThrough(2026, { mango: 1, vineTime: 1 });
    expect(r).toMatchObject({ finished: true });
  }, 120000);
});
