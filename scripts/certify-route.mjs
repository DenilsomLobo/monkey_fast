/** Execute após mudar o layout ou a física; a certificação fica fora da partida. */
import { writeFile } from 'node:fs/promises';
import { generateLayout } from '../src/core/levelGenerator.js';
import { certifyCollectibleRoute } from '../src/core/routeCertification.js';

const layout = generateLayout();
const route = certifyCollectibleRoute(layout);
const data = {
  seed: layout.seed,
  vines: layout.vines.map(v => [v.ax, v.ay, v.length, v.amp, v.speed, v.theta, v.omega]),
  ...route,
};
await writeFile(new URL('../src/core/certifiedRoute.js', import.meta.url),
  '/** Rota pré-calculada por scripts/certify-route.mjs. Não execute o robô ao abrir a partida. */\n'
  + 'export const certifiedRoute = ' + JSON.stringify(data) + ';\n');
console.log(`Rota certificada: ${route.flights.length} voos e ${route.powerups.length} power-ups.`);
