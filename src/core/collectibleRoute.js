/** A partida usa dados certificados, sem simular centenas de segundos no navegador. */
import { certifiedRoute } from './certifiedRoute.js';

export function collectibleRoute(layout) {
  if (layout.seed !== certifiedRoute.seed) {
    throw new Error('Layout sem rota certificada. Gere os dados com scripts/certify-route.mjs.');
  }
  return certifiedRoute;
}
