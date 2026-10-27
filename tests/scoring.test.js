import { describe, it, expect } from 'vitest';
import { computeScore, compareRanking, formatTime } from '../src/core/scoring.js';

describe('pontuação', () => {
  it('exemplo do GDD: 100 bananas + 4 power-ups = 312', () => {
    const s = computeScore({ bananas: 100, powerups: 4, totalBananas: 100, totalPowerups: 4 });
    expect(s).toEqual({ basic: 104, perfect: true, bonus: 208, total: 312 });
  });
  it('sem coleta integral não há bônus', () => {
    expect(computeScore({ bananas: 99, powerups: 4, totalBananas: 100, totalPowerups: 4 }).total).toBe(103);
    expect(computeScore({ bananas: 100, powerups: 3, totalBananas: 100, totalPowerups: 4 }).perfect).toBe(false);
  });
  it('zero itens = zero pontos', () => {
    expect(computeScore({ bananas: 0, powerups: 0, totalBananas: 100, totalPowerups: 4 }).total).toBe(0);
  });
  it('ranking: maior pontuação e, no empate, menor tempo', () => {
    const list = [
      { name: 'a', score: 100, timeMs: 90000 },
      { name: 'b', score: 312, timeMs: 120000 },
      { name: 'c', score: 100, timeMs: 80000 },
    ].sort(compareRanking);
    expect(list.map((x) => x.name)).toEqual(['b', 'c', 'a']);
  });
  it('formata o tempo', () => {
    expect(formatTime(83456)).toBe('01:23.45');
  });
});
