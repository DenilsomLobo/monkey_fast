/**
 * Copia a lógica pura do jogo (src/core) para functions/shared, para que a
 * Cloud Function valide os resultados com exatamente o mesmo código do jogo.
 * Executado automaticamente no deploy (predeploy do firebase.json).
 */
import { cp, rm, mkdir, writeFile } from 'node:fs/promises';

const dest = 'functions/shared';
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp('src/core', dest, { recursive: true });
await writeFile(`${dest}/README.md`, 'Cópia gerada de src/core por scripts/sync-functions.mjs — não edite aqui.\n');
console.log('src/core copiado para', dest);
