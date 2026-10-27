import { describe, it, expect } from 'vitest';
import { PowerUpTimers } from '../src/core/powerUpTimers.js';
import { POWERUP_DURATION } from '../src/core/constants.js';

function run(t, seconds, dt = 1 / 120) {
  const expired = [];
  for (let i = 0; i < Math.round(seconds / dt); i++) expired.push(...t.update(dt));
  return expired;
}

describe('power-ups', () => {
  it('a manga dura exatamente 7 segundos', () => {
    const t = new PowerUpTimers();
    t.activate('mango');
    run(t, 6.9);
    expect(t.isActive('mango')).toBe(true);
    const expired = run(t, 0.2);
    expect(expired).toEqual(['mango']);
    expect(t.isActive('mango')).toBe(false);
    expect(POWERUP_DURATION).toBe(7);
  });
  it('a goiaba dura 7 segundos e o efeito some gradualmente', () => {
    const t = new PowerUpTimers();
    t.activate('guava');
    run(t, 7.01);
    expect(t.isActive('guava')).toBe(false);
    expect(t.level('guava')).toBeGreaterThan(0); // ainda em transição
    run(t, 1);
    expect(t.level('guava')).toBe(0);
  });
  it('a intensidade sobe suavemente (sem mudança instantânea)', () => {
    const t = new PowerUpTimers();
    t.activate('mango');
    t.update(1 / 120);
    expect(t.level('mango')).toBeLessThan(0.05);
  });
  it('os dois podem estar ativos juntos e a música fica em 2X (não 4X)', () => {
    const t = new PowerUpTimers();
    t.activate('mango');
    t.activate('guava');
    run(t, 1);
    expect(t.isActive('mango') && t.isActive('guava')).toBe(true);
    expect(t.musicRate()).toBe(2);
    run(t, 7);
    expect(t.musicRate()).toBe(1);
  });
  it('coletar de novo reinicia o tempo sem acumular', () => {
    const t = new PowerUpTimers();
    t.activate('mango');
    run(t, 5);
    t.activate('mango');
    expect(t.remaining('mango')).toBe(7);
  });
  it('não depende da taxa de quadros', () => {
    const a = new PowerUpTimers();
    const b = new PowerUpTimers();
    a.activate('mango'); b.activate('mango');
    run(a, 3, 1 / 30); run(b, 3, 1 / 144);
    expect(a.remaining('mango')).toBeCloseTo(b.remaining('mango'), 5);
  });
});
