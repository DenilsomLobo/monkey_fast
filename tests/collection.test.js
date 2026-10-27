import { describe, it, expect } from 'vitest';
import { buildLevel, makeKillY } from '../src/core/levelGenerator.js';
import { createMonkeySim, stepWorld } from '../src/core/monkeySim.js';
import { createAutoPilot } from '../src/core/autoPilot.js';
import { PowerUpTimers } from '../src/core/powerUpTimers.js';
import { collectibleBody, canCollect } from '../src/core/collectibleGeometry.js';
import { FIXED_DT, PHYS, GUAVA_VINE_SPEED, LEVEL_VERSION } from '../src/core/constants.js';
import { validateRunResult } from '../src/core/validation.js';

describe('coleta integral com a física real', () => {
  it.each([0, 1, 42, 2026, 31337, 999999, 0xffffffff])('coleta 100 bananas e 4 power-ups e vence (semente %i)', seed => {
    const level = buildLevel(seed);
    const start = level.platforms[0];
    const world = { vines: level.vines, platforms: level.platforms, killY: makeKillY(level) };
    // Mesmo ponto inicial, ordem de passos e raio usados em GameScene.
    const sim = createMonkeySim(start.x1 + 220, start.y - PHYS.GRAB_TO_FEET);
    const pilot = createAutoPilot(world);
    const timers = new PowerUpTimers();
    const items = [...level.bananas, ...level.powerups].sort((a, b) => a.x - b.x);
    const collected = new Set(), events = [];
    const mods = () => ({ mango: timers.level('mango'), vineTime: 1 + (GUAVA_VINE_SPEED - 1) * timers.level('guava') });
    let prev = collectibleBody(sim), finished = false, timeMs = 0;
    for (let step = 0; step < 900 / FIXED_DT; step++) {
      const input = pilot.decide(sim, mods());
      timers.update(FIXED_DT);
      stepWorld(sim, input, world, FIXED_DT, mods());
      timeMs = (step + 1) * FIXED_DT * 1000;
      for (const e of sim.events) {
        if (e.type === 'grab') events.push({ k: 'g', id: e.vineId, t: timeMs });
        if (e.type === 'finish') finished = true;
      }
      const body = collectibleBody(sim);
      // A vitória captura o resultado antes da coleta do último passo na cena.
      if (finished) break;
      for (const item of items) {
        if (collected.has(item.id) || !canCollect(prev, body, item)) continue;
        collected.add(item.id);
        events.push({ k: 'c', id: item.id, t: timeMs });
        if (item.type) timers.activate(item.type);
      }
      prev = body;
      if (sim.mode === 'dead') break;
      sim.events.length = 0;
    }
    expect(finished).toBe(true);
    expect(level.bananas.filter(b => !collected.has(b.id))).toEqual([]);
    expect(level.powerups.filter(p => !collected.has(p.id))).toEqual([]);
    const result = validateRunResult({
      name: 'Tester', seed, levelVersion: LEVEL_VERSION, timeMs, events,
      bananas: level.bananas.filter(b => collected.has(b.id)).map(b => b.id),
      powerups: level.powerups.filter(p => collected.has(p.id)).map(p => p.id),
    });
    expect(result.errors).toEqual([]);
    expect(result.score).toMatchObject({ perfect: true, total: 312 });
  }, 120000);

  it('detecta a banana atravessada entre dois passos rápidos', () => {
    expect(canCollect({ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 100, y: 0 })).toBe(true);
    expect(canCollect({ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 100, y: PHYS.PICKUP_RADIUS + 1 })).toBe(false);
  });
});
