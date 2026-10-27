/** Escolhe a qualidade gráfica (auto = detecta aparelhos mais fracos). */
export function resolveQuality(setting = 'auto') {
  if (setting && setting !== 'auto') return setting;
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const mem = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  if (mem <= 2 || cores <= 2) return 'low';
  if (coarse && (mem <= 4 || cores <= 4)) return 'medium';
  return coarse ? 'medium' : 'high';
}
