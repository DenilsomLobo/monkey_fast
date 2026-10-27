import { describe, it, expect } from 'vitest';
import { validateName, validateRunResult, minimumTimeMs } from '../src/core/validation.js';
import { buildLevel } from '../src/core/levelGenerator.js';
import { LEVEL_VERSION } from '../src/core/constants.js';

describe('nome do jogador', () => {
  it('aceita nomes válidos (com acentos)', () => {
    expect(validateName('João')).toBeNull();
    expect(validateName('Macaco_Veloz 2')).toBeNull();
  });
  it('recusa vazio, curto, longo ou com símbolos', () => {
    expect(validateName('')).not.toBeNull();
    expect(validateName(' a ')).not.toBeNull();
    expect(validateName('x'.repeat(17))).not.toBeNull();
    expect(validateName('<script>')).not.toBeNull();
  });
});

describe('validação de resultado (servidor)', () => {
  const seed = 4242;
  const level = buildLevel(seed);
  const all = {
    name: 'Tester',
    seed,
    levelVersion: LEVEL_VERSION,
    timeMs: 120000,
    bananas: level.bananas.map((b) => b.id),
    powerups: level.powerups.map((p) => p.id),
  };

  it('aceita uma partida perfeita plausível e recalcula a pontuação', () => {
    const r = validateRunResult(all, { serverElapsedMs: 130000 });
    expect(r.ok).toBe(true);
    expect(r.score.total).toBe(312);
    expect(r.score.perfect).toBe(true);
  });

  it('recusa itens inexistentes ou repetidos', () => {
    expect(validateRunResult({ ...all, bananas: [...all.bananas, 'b999'] }).ok).toBe(false);
    expect(validateRunResult({ ...all, bananas: ['b1', 'b1'] }).ok).toBe(false);
  });

  it('recusa tempo impossível ou maior que o medido no servidor', () => {
    expect(validateRunResult({ ...all, timeMs: minimumTimeMs(level) - 1 }).ok).toBe(false);
    expect(validateRunResult({ ...all, timeMs: 120000 }, { serverElapsedMs: 60000 }).ok).toBe(false);
  });

  it('recusa versão errada da fase', () => {
    expect(validateRunResult({ ...all, levelVersion: 'v0' }).ok).toBe(false);
  });

  it('recusa itens coletados fora do trecho da fase (eventos)', () => {
    const events = [{ t: 1000, k: 'g', id: 0 }, { t: 1500, k: 'c', id: level.bananas[90].id }];
    expect(validateRunResult({ ...all, events }).ok).toBe(false);
  });

  it('aceita eventos coerentes', () => {
    const events = [];
    let t = 0;
    for (let i = 0; i < level.vines.length; i++) {
      for (const b of level.bananas.filter((x) => x.gap === i)) events.push({ t: (t += 100), k: 'c', id: b.id });
      events.push({ t: (t += 900), k: 'g', id: i });
    }
    const bananas = events.filter((e) => e.k === 'c').map((e) => e.id);
    const r = validateRunResult({ ...all, bananas, powerups: [], events, timeMs: t + 2000 });
    expect(r.errors).toEqual([]);
  });
});
