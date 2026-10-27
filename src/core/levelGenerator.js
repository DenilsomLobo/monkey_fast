/**
 * Geração da fase "Floresta da Tempestade".
 *
 * 1) LAYOUT (cipós e galhos): gerado com a semente fixa LEVEL_SEED, igual para
 *    todos. Cada cipó novo só é aceito se o verificador de alcance provar que o
 *    salto a partir do anterior é possível com a folga mínima do trecho.
 * 2) ITENS: bananas sorteadas sobre os voos de uma travessia real certificada,
 *    com os quatro power-ups ativos quando coletados. Power-ups têm posições
 *    fixas nessa rota para não invalidar os voos seguintes. Quantidades fixas.
 */
import { LEVEL_SEED, LEVEL_VERSION, PHYS, TOTAL_BANANAS } from './constants.js';
import { createRng } from './rng.js';
import { createVine } from './vinePhysics.js';
import { evaluateJump } from './reachability.js';
import { collectibleRoute } from './collectibleRoute.js';

/** Parâmetros dos 6 trechos obrigatórios (dificuldade progressiva). */
/** Tamanhos de cipó sorteados pelo mapa: curtos, médios e longos. */
export const VINE_SIZES = {
  short: [170, 215],
  medium: [245, 310],
  long: [340, 430],
};

export const SECTION_PARAMS = [
  { id: 1, count: 16, dx: [310, 370], dy: [-25, 25], sizes: [0.25, 0.5, 0.25], amp: [0.34, 0.48], speed: [0.9, 1.0], minWindow: 0.25, maxAmp: 1.0 },
  { id: 2, count: 14, dx: [260, 330], dy: [-115, -75], sizes: [0.33, 0.34, 0.33], amp: [0.38, 0.52], speed: [0.95, 1.08], minWindow: 0.16, maxAmp: 1.1 },
  { id: 3, count: 16, dx: [360, 450], dy: [-45, 45], sizes: [0.33, 0.34, 0.33], amp: [0.3, 0.62], speed: [0.85, 1.25], minWindow: 0.14, maxAmp: 1.15 },
  { id: 4, count: 14, dx: [340, 430], dy: [70, 125], sizes: [0.33, 0.34, 0.33], amp: [0.34, 0.6], speed: [1.0, 1.2], minWindow: 0.14, maxAmp: 1.15 },
  { id: 5, count: 18, dx: [400, 500], dy: [-35, 35], sizes: [0.3, 0.35, 0.35], amp: [0.38, 0.64], speed: [1.0, 1.3], minWindow: 0.11, maxAmp: 1.2 },
  { id: 6, count: 14, dx: [350, 430], dy: [-100, -60], sizes: [0.35, 0.35, 0.3], amp: [0.4, 0.64], speed: [1.05, 1.35], minWindow: 0.1, maxAmp: 1.2 },
];

function pickLength(rng, sec) {
  const r = rng.next();
  const [ps, pm] = sec.sizes;
  const range = r < ps ? VINE_SIZES.short : r < ps + pm ? VINE_SIZES.medium : VINE_SIZES.long;
  return Math.round(rng.range(range[0], range[1]));
}

const START_PLATFORM = { x1: -420, x2: 120, y: 360 };

const layoutCache = new Map();

/** Gera (ou devolve do cache) o layout determinístico da fase. */
export function generateLayout(seed = LEVEL_SEED) {
  if (layoutCache.has(seed)) return cloneLayout(layoutCache.get(seed));
  const rng = createRng(seed);
  const vines = [];
  const gaps = [];
  const platforms = [{ ...START_PLATFORM, id: 0, kind: 'start' }];

  let prev = { type: 'platform', platform: platforms[0] };
  let ax = START_PLATFORM.x2 + 190;
  let ay = START_PLATFORM.y - 300;
  let id = 0;

  for (const sec of SECTION_PARAMS) {
    for (let k = 0; k < sec.count; k++) {
      const isFirst = id === 0;
      let dxMul = 1;
      let accepted = null;
      for (let attempt = 0; attempt < 20 && !accepted; attempt++) {
        const dx = isFirst ? 190 : rng.range(sec.dx[0], sec.dx[1]) * dxMul;
        const dy = isFirst ? 0 : rng.range(sec.dy[0], sec.dy[1]) * (attempt < 8 ? 1 : 0.5);
        const cand = createVine({
          id,
          ax: (isFirst ? ax : vines[vines.length - 1].ax + dx),
          ay: isFirst ? ay : vines[vines.length - 1].ay + dy,
          length: isFirst ? 270 : pickLength(rng, sec),
          amp: rng.range(sec.amp[0], sec.amp[1]),
          speed: rng.range(sec.speed[0], sec.speed[1]),
          phase: rng.range(0, Math.PI * 2),
          section: sec.id,
        });
        const res = evaluateJump(prev, { type: 'vine', vine: cand }, { maxAmp: sec.maxAmp });
        if (res.ok && res.window >= (isFirst ? 0.1 : sec.minWindow)) accepted = { vine: cand, res };
        else dxMul *= 0.9;
      }
      if (!accepted) {
        throw new Error(`Não foi possível gerar um salto válido para o cipó ${id} (trecho ${sec.id}).`);
      }
      vines.push(accepted.vine);
      gaps.push({ index: gaps.length, from: prev.type === 'vine' ? prev.vine.id : 'start', to: id, section: sec.id, window: accepted.res.window, paths: accepted.res.paths.slice(0, 4).map((p) => p.path) });
      prev = { type: 'vine', vine: accepted.vine };
      id++;
    }
  }

  // Galho final na árvore mais alta: grande salto a partir do último cipó
  const last = vines[vines.length - 1];
  let finalPlat = null;
  let finalRes = null;
  for (let lift = 0.62; lift <= 1.25 && !finalRes; lift += 0.07) {
    for (let dx = 320; dx >= 140 && !finalRes; dx -= 20) {
      const top = Math.round(last.ay + last.length * lift);
      const cand = { x1: Math.round(last.ax + dx), x2: Math.round(last.ax + dx + 560), y: top, final: true };
      const res = evaluateJump(prev, { type: 'platform', platform: cand }, { maxAmp: 1.2 });
      if (res.ok && res.window >= 0.14) { finalPlat = cand; finalRes = res; }
    }
  }
  if (!finalPlat) throw new Error('Galho final inalcançável.');
  platforms.push({ ...finalPlat, id: 1, kind: 'final' });
  gaps.push({ index: gaps.length, from: last.id, to: 'final', section: 6, window: finalRes.window, paths: finalRes.paths.slice(0, 4).map((p) => p.path) });

  const layout = {
    version: LEVEL_VERSION,
    seed,
    vines,
    platforms,
    gaps,
    bounds: computeBounds(vines, platforms),
  };
  layoutCache.set(seed, layout);
  return cloneLayout(layout);
}

function computeBounds(vines, platforms) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vines) {
    minX = Math.min(minX, v.ax - v.length);
    maxX = Math.max(maxX, v.ax + v.length);
    minY = Math.min(minY, v.ay);
    maxY = Math.max(maxY, v.ay + v.length);
  }
  for (const p of platforms) {
    minX = Math.min(minX, p.x1);
    maxX = Math.max(maxX, p.x2);
    minY = Math.min(minY, p.y - 200);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

/** Os cipós têm estado mutável (ângulo); cada partida recebe uma cópia nova. */
function cloneLayout(l) {
  return {
    ...l,
    vines: l.vines.map((v) => ({ ...v })),
    platforms: l.platforms.map((p) => ({ ...p })),
  };
}

/**
 * Distribui bananas e power-ups com a semente da partida.
 * Todos ficam sobre trajetórias válidas, sem sobreposição.
 */
export function placeItems(layout, itemSeed) {
  const rng = createRng(itemSeed >>> 0);
  const route = collectibleRoute(layout);
  const powerups = route.powerups.map(p => ({ ...p }));
  const placed = [...powerups];
  const bananas = [];
  // Alterne acima/abaixo do voo, reservando pelo menos 20 px do raio de
  // coleta para pequenas diferenças no salto, arredondamento e animação.
  const firstSide = rng.next() < 0.5 ? -1 : 1;
  const heightOffset = () => firstSide * (bananas.length % 2 === 0 ? 1 : -1)
    * rng.range(16, Math.min(32, PHYS.PICKUP_RADIUS - 20));
  const flights = route.flights.map(f => ({ ...f, path: resamplePath(f.path, 4) }));
  const counts = flights.map(() => 1);
  let extra = TOTAL_BANANAS - flights.length;
  const extraFlights = rng.shuffle(flights.map((_, i) => i).filter(i => pathLength(flights[i].path) >= 170));
  if (extra < 0 || extra > extraFlights.length * 2) throw new Error('Rota sem espaço para as 100 bananas.');
  for (let i = 0; extra > 0; i = (i + 1) % extraFlights.length) {
    if (counts[extraFlights[i]] < 3) { counts[extraFlights[i]]++; extra--; }
  }
  for (let i = 0; i < flights.length; i++) {
    const flight = flights[i];
    for (let k = 0; k < counts[i]; k++) {
      const fraction = 0.25 + 0.5 * (k + 0.5) / counts[i] + rng.range(-0.04, 0.04);
      const item = pickFreeSpot(flight.path, fraction, flight.gap, placed, heightOffset());
      if (!item) continue;
      placed.push(item);
      bananas.push({ ...item, id: 'b' + bananas.length });
    }
  }
  // Um voo curto pode não comportar todos os slots sem sobreposição.
  // Redistribua o restante na faixa segura dos outros voos certificados.
  const available = rng.shuffle([...flights]);
  while (bananas.length < TOTAL_BANANAS) {
    let added = false;
    for (const flight of available) {
      const item = pickFreeSpot(flight.path, 0.5, flight.gap, placed, heightOffset());
      if (!item) continue;
      placed.push(item);
      bananas.push({ ...item, id: 'b' + bananas.length });
      added = true;
      if (bananas.length === TOTAL_BANANAS) break;
    }
    if (!added) throw new Error('Rota sem espaço livre para as 100 bananas.');
  }
  return { bananas, powerups };
}

const MIN_ITEM_SPACING = 44;

function pathLength(path) {
  let len = 0;
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return len;
}

/** Reamostra a trajetória em pontos igualmente espaçados (step px). */
function resamplePath(path, step) {
  const out = [path[0]];
  let carry = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let d = step - carry;
    while (d <= seg) {
      const t = d / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      d += step;
    }
    carry = seg - (d - step);
  }
  out.push(path[path.length - 1]);
  return out;
}

/** Escolhe o ponto da trajetória mais próximo da fração f que não encoste em outro item. */
function pickFreeSpot(path, f, gap, placed, offsetY) {
  const n = path.length;
  const at = (idx) => {
    const p = path[Math.max(1, Math.min(n - 2, idx))];
    return { x: Math.round(p.x), y: Math.round(p.y + offsetY), gap };
  };
  const base = Math.round(f * (n - 1));
  const free = (it) => {
    for (let i = placed.length - 1; i >= 0; i--) {
      if (Math.hypot(placed[i].x - it.x, placed[i].y - it.y) < MIN_ITEM_SPACING) return false;
    }
    return true;
  };
  for (let d = 0; d < n; d++) {
    for (const idx of [base + d, base - d]) {
      if (idx < 1 || idx > n - 2) continue;
      const it = at(idx);
      if (free(it)) return it;
    }
  }
  return null;
}

/** Fase completa para uma partida. */
export function buildLevel(itemSeed, layoutSeed = LEVEL_SEED) {
  const layout = generateLayout(layoutSeed);
  const items = placeItems(layout, itemSeed);
  return { ...layout, ...items, itemSeed: itemSeed >>> 0 };
}

/** Linha de morte: abaixo do ponto mais baixo recuperável na região. */
export function makeKillY(level, margin = 650) {
  const vines = level.vines;
  const plats = level.platforms;
  return (x) => {
    let lowest = -Infinity;
    for (const v of vines) {
      if (Math.abs(v.ax - x) < 900) lowest = Math.max(lowest, v.ay + v.length);
    }
    for (const p of plats) {
      if (x > p.x1 - 900 && x < p.x2 + 900) lowest = Math.max(lowest, p.y);
    }
    if (lowest === -Infinity) lowest = level.bounds.maxY;
    return lowest + margin;
  };
}
