/** Diagnóstico de coleta na rota do robô; itens perdidos não provam impossibilidade. */
import { buildLevel, makeKillY } from '../src/core/levelGenerator.js';
import { createMonkeySim, stepWorld } from '../src/core/monkeySim.js';
import { createAutoPilot } from '../src/core/autoPilot.js';
import { PowerUpTimers } from '../src/core/powerUpTimers.js';
import { FIXED_DT, PHYS, GUAVA_VINE_SPEED } from '../src/core/constants.js';
import { collectibleBody as body, segmentPointDistance as distance, canCollect } from '../src/core/collectibleGeometry.js';

function audit(seed, powerupsEnabled) {
  const level = buildLevel(seed);
  const start = level.platforms[0];
  const world = { vines: level.vines, platforms: level.platforms, killY: makeKillY(level) };
  const sim = createMonkeySim(start.x1 + 220, start.y - PHYS.GRAB_TO_FEET);
  const pilot = createAutoPilot(world);
  const timers = new PowerUpTimers();
  const items = [...level.bananas, ...level.powerups].map(data => ({ data, collected: false, nearest: Infinity }));
  let prev = body(sim), status = 'timeout', time = 0;
  for (; time < 900; time += FIXED_DT) {
    // Mesma ordem de GameScene: entrada, timers, física, coleta.
    const input = pilot.decide(sim, { mango: timers.level('mango'), vineTime: 1 + (GUAVA_VINE_SPEED - 1) * timers.level('guava') });
    timers.update(FIXED_DT);
    stepWorld(sim, input, world, FIXED_DT, {
      mango: timers.level('mango'),
      vineTime: 1 + (GUAVA_VINE_SPEED - 1) * timers.level('guava'),
    });
    const current = body(sim);
    for (const item of items) {
      const d = distance(prev, current, item.data);
      item.nearest = Math.min(item.nearest, d);
      if (!item.collected && canCollect(prev, current, item.data)) {
        item.collected = true;
        if (powerupsEnabled && item.data.type) timers.activate(item.data.type);
      }
    }
    prev = current;
    if (sim.events.some(e => e.type === 'finish')) { status = 'finished'; break; }
    if (sim.events.some(e => e.type === 'dead')) { status = 'dead'; break; }
    sim.events.length = 0;
  }
  const bananas = items.filter(i => !i.data.type);
  return {
    seed, powerupsEnabled, status, seconds: Math.round(time * 100) / 100,
    bananas: bananas.filter(i => i.collected).length,
    powerups: items.filter(i => i.data.type && i.collected).length,
    missed: bananas.filter(i => !i.collected).map(i => ({
      id: i.data.id, gap: i.data.gap, x: i.data.x, y: i.data.y,
      nearestDistance: Math.round(i.nearest * 10) / 10,
    })),
  };
}

const seeds = process.argv.slice(2).map(Number);
if (seeds.some(s => !Number.isInteger(s) || s < 0 || s > 0xffffffff)) {
  throw new Error('Informe sementes inteiras entre 0 e 4294967295.');
}
console.log(JSON.stringify({
  note: 'O robô procura a saída, não todos os itens. Bananas perdidas nesta rota não provam que sejam impossíveis.',
  runs: (seeds.length ? seeds : [1, 42, 2026]).flatMap(seed => [audit(seed, false), audit(seed, true)]),
}, null, 2));
