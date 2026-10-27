/**
 * Gera versões otimizadas (leves) das imagens de referência da pasta /assets
 * para /public/assets, que é o que o jogo carrega.
 *
 * Uso: npm run assets (roda também build-sprites e generate-art)
 *
 * As imagens originais ficam intocadas em /assets (fonte de arte).
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets';
const OUT = 'public/assets';

async function ensure(dir) {
  await mkdir(path.join(OUT, dir), { recursive: true });
}

async function main() {
  await Promise.all(['characters', 'environment', 'collectibles', 'ui', 'audio', 'effects'].map(ensure));

  // Colecionáveis (PNG com transparência)
  await sharp(`${SRC}/banana_coin.png`).trim().resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: false }).toFile(`${OUT}/collectibles/banana.png`);
  await sharp(`${SRC}/manga_power_up.png`).trim().resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 }).toFile(`${OUT}/collectibles/manga.png`);
  await sharp(`${SRC}/Goiaba_power_up.png`).trim().resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 }).toFile(`${OUT}/collectibles/goiaba.png`);

  // Retratos (menu, tutorial e telas finais)
  const portrait = (src, out) => sharp(`${SRC}/${src}`).resize(540).jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/characters/${out}`);
  await portrait('personagem_principal.png', 'monkey_portrait.jpg');
  await portrait('personagem_feminino.png', 'companion_portrait.jpg');
  await portrait('onça_inimiga.png', 'jaguar_portrait.jpg');

  // Ícone do app / favicon
  await sharp(`${SRC}/banana_coin.png`).trim().resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(`${OUT}/ui/icon-192.png`);

  console.log('Assets otimizados em', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
