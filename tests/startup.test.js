import { describe, expect, it, vi } from 'vitest';
// Iniciar uma partida não deve executar o robô nem depender de ele terminar.
vi.mock('../src/core/autoPilot.js', () => ({ createAutoPilot: () => { throw new Error('Robô executado na inicialização'); } }));
import { buildLevel, generateLayout } from '../src/core/levelGenerator.js';
import { certifiedRoute } from '../src/core/certifiedRoute.js';

describe('preparação da partida', () => {
  it('abre a fase sem executar a certificação durante o jogo', () => {
    const level = buildLevel(2026);
    expect(level.bananas).toHaveLength(100);
    expect(level.powerups).toHaveLength(4);
  });

  it('mantém a rota pré-calculada compatível com o layout atual', () => {
    const layout = generateLayout();
    expect(layout.seed).toBe(certifiedRoute.seed);
    expect(layout.vines.map(v => [v.ax, v.ay, v.length, v.amp, v.speed, v.theta, v.omega])).toEqual(certifiedRoute.vines);
  });
});
