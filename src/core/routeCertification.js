/** Rota testemunha: física real, capturas reais e power-ups coletados durante o voo. */
import { createAutoPilot } from './autoPilot.js';
import { createMonkeySim, stepWorld } from './monkeySim.js';
import { PowerUpTimers } from './powerUpTimers.js';
import { FIXED_DT, PHYS, GUAVA_VINE_SPEED } from './constants.js';
import { collectibleBody, canCollect } from './collectibleGeometry.js';

const cache = new Map();

function trace(layout, powerups) {
  const vines = layout.vines.map(v => ({ ...v }));
  const world = { vines, platforms: layout.platforms };
  const start = world.platforms[0];
  const sim = createMonkeySim(start.x1 + 220, start.y - PHYS.GRAB_TO_FEET);
  const pilot = createAutoPilot(world);
  const timers = new PowerUpTimers();
  const collected = new Set();
  const flights = [];
  let path = [], prev = collectibleBody(sim);
  for (let t = 0; t < 900; t += FIXED_DT) {
    const mods = () => ({ mango: timers.level('mango'), vineTime: 1 + (GUAVA_VINE_SPEED - 1) * timers.level('guava') });
    const input = pilot.decide(sim, mods());
    timers.update(FIXED_DT);
    const wasAir = sim.mode === 'air';
    stepWorld(sim, input, world, FIXED_DT, mods());
    const body = collectibleBody(sim);
    if (wasAir || sim.mode === 'air') {
      if (!path.length) path.push(prev);
      path.push(body);
    }
    for (const p of powerups) {
      if (!collected.has(p.id) && canCollect(prev, body, p)) {
        collected.add(p.id);
        timers.activate(p.type);
      }
    }
    const grab = sim.events.find(e => e.type === 'grab');
    const finish = sim.events.some(e => e.type === 'finish');
    if ((grab || finish) && path.length > 1) {
      // Mesma numeração usada pela validação de eventos do ranking.
      flights.push({ gap: finish ? vines.length : grab.vineId, path });
      path = [];
    }
    if (finish) return { flights, collected };
    prev = body;
    sim.events.length = 0;
  }
  throw new Error('Não foi possível certificar a rota de coleta da fase.');
}

export function certifyCollectibleRoute(layout) {
  if (cache.has(layout.seed)) return cache.get(layout.seed);
  let route = trace(layout, []);
  const types = ['mango', 'guava', 'mango', 'guava'];
  const powerups = types.map((type, i) => {
    const flight = route.flights[Math.floor(route.flights.length * (i + 1) / 5)];
    const p = flight.path[Math.floor(flight.path.length / 2)];
    return { id: `p${i}`, type, gap: flight.gap, x: Math.round(p.x), y: Math.round(p.y) };
  });
  // Um power-up pode mudar os voos seguintes. Reposiciona só os que a nova
  // trajetória perdeu e verifica novamente, até testemunhar os quatro juntos.
  for (let attempt = 0; attempt < 12; attempt++) {
    route = trace(layout, powerups);
    if (route.collected.size === powerups.length) {
      const result = { flights: route.flights, powerups };
      cache.set(layout.seed, result);
      return result;
    }
    for (const p of powerups) {
      if (route.collected.has(p.id)) continue;
      const flight = route.flights.reduce((a, b) => Math.abs(a.gap - p.gap) <= Math.abs(b.gap - p.gap) ? a : b);
      const point = flight.path[Math.floor(flight.path.length / 2)];
      Object.assign(p, { gap: flight.gap, x: Math.round(point.x), y: Math.round(point.y) });
    }
  }
  throw new Error('Não foi possível certificar os quatro power-ups na mesma partida.');
}
