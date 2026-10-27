import { describe, it, expect } from 'vitest';
import { generateLayout, buildLevel, SECTION_PARAMS } from '../src/core/levelGenerator.js';
import { evaluateJump } from '../src/core/reachability.js';
import { TOTAL_BANANAS, MAX_MANGOS, MAX_GUAVAS, PHYS } from '../src/core/constants.js';
import { collectibleRoute } from '../src/core/collectibleRoute.js';

describe('geração da fase', () => {
  const layout = generateLayout();

  it('tem entre 80 e 100 cipós nos 6 trechos', () => {
    expect(layout.vines.length).toBeGreaterThanOrEqual(80);
    expect(layout.vines.length).toBeLessThanOrEqual(100);
    expect(new Set(layout.vines.map((v) => v.section))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it('é determinística', () => {
    const again = generateLayout();
    expect(again.vines.map((v) => [v.ax, v.ay, v.length])).toEqual(layout.vines.map((v) => [v.ax, v.ay, v.length]));
  });

  it('segue a sequência horizontal, subida, horizontal, descida, horizontal, diagonal', () => {
    const rise = (sec) => {
      const vs = layout.vines.filter((v) => v.section === sec);
      return vs[vs.length - 1].ay - vs[0].ay; // negativo = subiu
    };
    expect(Math.abs(rise(1))).toBeLessThan(250);
    expect(rise(2)).toBeLessThan(-700);
    expect(Math.abs(rise(3))).toBeLessThan(400);
    expect(rise(4)).toBeGreaterThan(700);
    expect(Math.abs(rise(5))).toBeLessThan(400);
    expect(rise(6)).toBeLessThan(-500);
  });

  it('os cipós avançam sempre para a direita', () => {
    for (let i = 1; i < layout.vines.length; i++) {
      expect(layout.vines[i].ax).toBeGreaterThan(layout.vines[i - 1].ax);
    }
  });

  it('todo salto foi verificado como possível, com a folga mínima do trecho', () => {
    for (const g of layout.gaps) {
      const sec = SECTION_PARAMS.find((s) => s.id === g.section);
      expect(g.window).toBeGreaterThan(0);
      if (g.to !== 'final' && g.from !== 'start') expect(g.window).toBeGreaterThanOrEqual(sec.minWindow - 1e-9);
      expect(g.paths.length).toBeGreaterThan(0);
    }
  });

  it('reverificação independente de cada salto', () => {
    const vines = layout.vines;
    for (let i = 1; i < vines.length; i++) {
      const sec = SECTION_PARAMS.find((s) => s.id === vines[i].section);
      const r = evaluateJump({ type: 'vine', vine: vines[i - 1] }, { type: 'vine', vine: vines[i] }, { maxAmp: sec.maxAmp, keepPaths: false });
      expect(r.ok).toBe(true);
    }
  });

  it('termina em um galho final', () => {
    const fin = layout.platforms.find((p) => p.final);
    expect(fin).toBeTruthy();
    expect(fin.x1).toBeGreaterThan(layout.vines[layout.vines.length - 1].ax);
  });
});

describe('distribuição de itens', () => {
  it('varia acima e abaixo dos voos reais, mantendo margem dentro do raio de coleta', () => {
    for (const seed of [1, 42, 2026]) {
      const level = buildLevel(seed);
      const flights = collectibleRoute(level).flights;
      let above = 0, below = 0;
      for (const banana of level.bananas) {
        const path = flights.filter(f => f.gap === banana.gap).flatMap(f => f.path);
        const nearest = path.reduce((a, b) => Math.hypot(a.x - banana.x, a.y - banana.y)
          <= Math.hypot(b.x - banana.x, b.y - banana.y) ? a : b);
        expect(Math.hypot(nearest.x - banana.x, nearest.y - banana.y)).toBeLessThan(PHYS.PICKUP_RADIUS - 15);
        if (banana.y < nearest.y - 1) above++;
        if (banana.y > nearest.y + 1) below++;
      }
      expect(above).toBeGreaterThanOrEqual(20);
      expect(below).toBeGreaterThanOrEqual(20);
    }
  }, 120000);

  it('quantidade fixa para qualquer semente: 100 bananas, 2 mangas, 2 goiabas', () => {
    for (const seed of [1, 42, 999999, 0xdeadbeef]) {
      const lv = buildLevel(seed);
      expect(lv.bananas.length).toBe(TOTAL_BANANAS);
      expect(lv.powerups.filter((p) => p.type === 'mango').length).toBe(MAX_MANGOS);
      expect(lv.powerups.filter((p) => p.type === 'guava').length).toBe(MAX_GUAVAS);
    }
  }, 120000);

  it('sementes diferentes mudam a distribuição; a mesma semente repete', () => {
    const a = buildLevel(7);
    const b = buildLevel(8);
    const a2 = buildLevel(7);
    expect(a.bananas).toEqual(a2.bananas);
    expect(a.bananas).not.toEqual(b.bananas);
  });

  it('itens não se sobrepõem', () => {
    for (const seed of [123, 77, 31337]) {
      const lv = buildLevel(seed);
      const all = [...lv.bananas, ...lv.powerups];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          expect(Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)).toBeGreaterThan(30);
        }
      }
    }
  });

  it('IDs únicos', () => {
    const lv = buildLevel(5);
    const ids = [...lv.bananas, ...lv.powerups].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
