/**
 * Regras de pontuação (GDD §12).
 *   Pontos básicos = bananas + power-ups
 *   Coletou TUDO  → bônus perfeito = básicos × 2
 *   Final         = básicos + bônus
 */
export function computeScore({ bananas, powerups, totalBananas, totalPowerups }) {
  const basic = bananas + powerups;
  const perfect = totalBananas + totalPowerups > 0 && bananas >= totalBananas && powerups >= totalPowerups;
  const bonus = perfect ? basic * 2 : 0;
  return { basic, perfect, bonus, total: basic + bonus };
}

/** Ordenação do ranking: maior pontuação; empate → menor tempo; depois o mais antigo. */
export function compareRanking(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  return (a.date ?? 0) - (b.date ?? 0);
}

export function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms));
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
