/**
 * Validação de nome e de resultados de partida.
 * Compartilhado entre o jogo e a Cloud Function (functions/shared é uma cópia
 * gerada por `npm run sync:functions`).
 *
 * O servidor NÃO confia na pontuação enviada: ele regenera a fase a partir da
 * semente, confere cada item coletado e recalcula a pontuação.
 * Não é uma proteção antifraude completa (não há replay determinístico da partida);
 * são verificações de plausibilidade descritas no README.
 */
import { LEVEL_VERSION, MAX_MANGOS, MAX_GUAVAS } from './constants.js';
import { buildLevel } from './levelGenerator.js';
import { computeScore } from './scoring.js';

export const NAME_MIN = 2;
export const NAME_MAX = 16;
const NAME_RE = /^[\p{L}\p{N} _.\-]+$/u;

export function sanitizeName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

/** Retorna null se válido, ou a mensagem de erro em português. */
export function validateName(raw) {
  const name = sanitizeName(raw);
  if (name.length < NAME_MIN) return `O nome precisa ter pelo menos ${NAME_MIN} caracteres.`;
  if (name.length > NAME_MAX) return `O nome pode ter no máximo ${NAME_MAX} caracteres.`;
  if (!NAME_RE.test(name)) return 'Use apenas letras, números, espaço, ponto, hífen ou sublinhado.';
  return null;
}

/** Tempo mínimo fisicamente plausível para atravessar a fase (ms). */
export function minimumTimeMs(level) {
  const start = level.platforms[0].x2;
  const end = level.platforms[level.platforms.length - 1].x1;
  return Math.floor(((end - start) / 1700) * 1000);
}

/**
 * Valida o resultado enviado pelo cliente.
 * @param payload { name, seed, levelVersion, timeMs, bananas: string[], powerups: string[], events? }
 * @param opts    { serverElapsedMs?: number } tempo medido pelo servidor desde o início da partida
 */
export function validateRunResult(payload, opts = {}) {
  const errors = [];
  if (!payload || typeof payload !== 'object') return { ok: false, errors: ['payload inválido'] };

  const nameError = validateName(payload.name);
  if (nameError) errors.push(nameError);
  if (payload.levelVersion !== LEVEL_VERSION) errors.push('versão da fase incompatível');

  const seed = Number(payload.seed);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) errors.push('semente inválida');

  const timeMs = Number(payload.timeMs);
  if (!Number.isFinite(timeMs)) errors.push('tempo inválido');
  if (errors.length) return { ok: false, errors };

  const level = buildLevel(seed);
  const minMs = minimumTimeMs(level);
  if (timeMs < minMs) errors.push('tempo menor que o fisicamente possível');
  if (timeMs > 60 * 60 * 1000) errors.push('tempo maior que o limite');
  if (opts.serverElapsedMs != null && timeMs > opts.serverElapsedMs + 5000) {
    errors.push('tempo maior que o medido pelo servidor');
  }

  const bananaIds = new Set(level.bananas.map((b) => b.id));
  const puById = new Map(level.powerups.map((p) => [p.id, p]));
  const bananas = Array.isArray(payload.bananas) ? payload.bananas : [];
  const powerups = Array.isArray(payload.powerups) ? payload.powerups : [];
  if (new Set(bananas).size !== bananas.length) errors.push('banana repetida');
  if (new Set(powerups).size !== powerups.length) errors.push('power-up repetido');
  if (bananas.some((id) => !bananaIds.has(id))) errors.push('banana inexistente');
  if (powerups.some((id) => !puById.has(id))) errors.push('power-up inexistente');
  const mangos = powerups.filter((id) => puById.get(id)?.type === 'mango').length;
  const guavas = powerups.filter((id) => puById.get(id)?.type === 'guava').length;
  if (mangos > MAX_MANGOS || guavas > MAX_GUAVAS) errors.push('power-ups acima do máximo');

  // Eventos (opcional): ordem temporal coerente e itens coletados na região certa da fase
  if (Array.isArray(payload.events) && payload.events.length) {
    errors.push(...checkEvents(payload.events, level, timeMs));
  }

  const score = computeScore({
    bananas: bananas.length,
    powerups: powerups.length,
    totalBananas: level.bananas.length,
    totalPowerups: level.powerups.length,
  });
  return { ok: errors.length === 0, errors, score, level };
}

function checkEvents(events, level, timeMs) {
  const errors = [];
  const gapOf = new Map([...level.bananas, ...level.powerups].map((i) => [i.id, i.gap]));
  let lastT = -1;
  let maxVine = -1;
  for (const e of events) {
    if (!e || typeof e.t !== 'number' || e.t < lastT || e.t > timeMs + 1000) { errors.push('eventos fora de ordem'); break; }
    lastT = e.t;
    if (e.k === 'g') {
      if (!Number.isInteger(e.id) || e.id < 0 || e.id >= level.vines.length) { errors.push('cipó inválido'); break; }
      maxVine = Math.max(maxVine, e.id);
    } else if (e.k === 'c') {
      const gap = gapOf.get(e.id);
      // o item do salto N fica entre o cipó N-1 e o cipó N
      if (gap == null || gap > maxVine + 4 || gap < maxVine - 6) { errors.push('item coletado fora do trecho'); break; }
    }
  }
  if (maxVine < level.vines.length - 3) errors.push('percurso de cipós incompleto');
  return errors;
}
