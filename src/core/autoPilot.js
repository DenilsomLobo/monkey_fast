/**
 * Piloto automático: joga a fase usando a física real.
 *
 * Usado (1) no teste que prova que a fase inteira pode ser atravessada e
 * (2) na demonstração animada do menu e do tutorial.
 *
 * Estratégia: no cipó, bombeia o balanço; a cada poucos passos, prevê
 * (simulando de verdade) o que aconteceria se soltasse agora. Solta quando a
 * previsão agarra um cipó mais à frente ou pousa no galho final.
 */
import { FIXED_DT, PHYS } from './constants.js';
import { stepMonkey } from './monkeySim.js';
import { stepFreeVine } from './vinePhysics.js';

export function createAutoPilot(world, { targetAmp = 1.1, checkEvery = 3, preferR = 0.92 } = {}) {
  let tick = 0;
  let onVine = -1;
  let vineTime = 0;
  // se demorar para achar o salto, experimenta outras alturas e balanços (como um jogador)
  const strategies = [[preferR, targetAmp], [0.75, targetAmp], [0.55, targetAmp], [0.92, 1.2], [0.65, 1.2], [0.45, 1.2]];
  return {
    decide(sim, mods = { mango: 0, vineTime: 1 }) {
      tick++;
      const input = { x: 0, y: 0, jumpPressed: false };
      if (sim.mode === 'ground') {
        const p = world.platforms[sim.platformId];
        if (p.final) return input;
        input.x = 1;
        if (sim.x >= p.x2 - 25) input.jumpPressed = true;
        return input;
      }
      if (sim.mode !== 'vine') return input;

      const v = sim.vine;
      if (v.id !== onVine) { onVine = v.id; vineTime = 0; }
      vineTime += FIXED_DT;
      const [rFrac, amp] = strategies[Math.floor(vineTime / 5) % strategies.length];
      if (Math.abs(v.theta) < amp) input.x = Math.sign(v.omega) || 1;
      const rPref = Math.max(PHYS.VINE_MIN_R + 10, (v.length - PHYS.VINE_TIP_MARGIN) * rFrac);
      if (sim.r < rPref - 6) input.y = 1;
      else if (sim.r > rPref + 6) input.y = -1;

      if (v.omega > 0 && tick % checkEvery === 0) {
        const outcome = predictRelease(sim, world, mods, 1.7, 0.6, input);
        if (outcome === 'final' || (typeof outcome === 'number' && outcome > v.id)) {
          input.jumpPressed = true;
        }
      }
      return input;
    },
  };
}

/** Simula "soltar agora" numa cópia do mundo. Retorna id do cipó agarrado, 'final' ou null. */
export function predictRelease(sim, world, mods, maxTime = 1.7, margin = 0.6, input = { x: 0, y: 0 }) {
  const near = world.vines.filter((v) => v.id === sim.vine.id || (v.ax > sim.x - 450 && v.ax < sim.x + 2000));
  const copies = near.map((v) => ({ ...v }));
  const byId = new Map(copies.map((v) => [v.id, v]));
  const s = { ...sim, events: [], vine: byId.get(sim.vine.id) };
  const w = { vines: copies, platforms: world.platforms, killY: world.killY };

  const noInput = { x: 0, y: 0, jumpPressed: false };
  // a soltura usa a mesma entrada (impulso/subida) do passo real
  const release = { x: input.x, y: input.y, jumpPressed: true };
  for (let t = 0; t < maxTime; t += FIXED_DT) {
    // mesma ordem do jogo: cipós livres primeiro, depois o macaco
    for (const v of copies) if (!v.occupied) stepFreeVine(v, FIXED_DT, mods.vineTime ?? 1);
    stepMonkey(s, t === 0 ? release : noInput, w, FIXED_DT, mods);
    for (const e of s.events) {
      // só confia em agarres com folga (não "raspando" no limite do alcance)
      if (e.type === 'grab') return Math.hypot(e.dx, e.dy) <= PHYS.CAPTURE_RADIUS * margin ? e.vineId : null;
      if (e.type === 'finish') return 'final';
      if (e.type === 'dead') return null;
    }
    s.events.length = 0;
    if (s.mode === 'ground') return null;
  }
  return null;
}
