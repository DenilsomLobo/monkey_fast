/**
 * Ajustes automáticos nas artes do cenário logo após o carregamento, para que
 * qualquer PNG colocado em public/assets/environment funcione sem retoque:
 *  - imagens que se repetem (céu, camadas, primeiro plano, tronco) têm as
 *    bordas misturadas para esconder a emenda;
 *  - as árvores de início/fim somem em degradê na borda de baixo (o tronco
 *    continua com trunk.png);
 *  - copas grandes são reduzidas (economia de memória) e o ponto onde o cipó
 *    se prende é medido na própria imagem.
 * As medidas ficam em public/assets/art.json.
 */

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function replace(scene, key, c) {
  scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
}

/** Mistura o fim da imagem no começo: repetida lado a lado, não há emenda. */
function makeSeamless(scene, key, axis, blend) {
  if (!scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  const W = src.width;
  const H = src.height;
  const horiz = axis !== 'y';
  const B = Math.round((horiz ? W : H) * blend);
  if (B < 2) return;
  const out = canvas(horiz ? W - B : W, horiz ? H : H - B);
  const ctx = out.getContext('2d');
  ctx.drawImage(src, 0, 0);
  // cauda da imagem com peso 1 → 0 ao longo da faixa de mistura
  const tail = canvas(horiz ? B : W, horiz ? H : B);
  const tctx = tail.getContext('2d');
  if (horiz) tctx.drawImage(src, W - B, 0, B, H, 0, 0, B, H);
  else tctx.drawImage(src, 0, H - B, W, B, 0, 0, W, B);
  const ramp = (c2d) => {
    const g = horiz ? c2d.createLinearGradient(0, 0, B, 0) : c2d.createLinearGradient(0, 0, 0, B);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    return g;
  };
  tctx.globalCompositeOperation = 'destination-in';
  tctx.fillStyle = ramp(tctx);
  tctx.fillRect(0, 0, tail.width, tail.height);
  // começo da imagem com peso 0 → 1 (soma exata = mistura linear, inclusive no alpha)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = ramp(ctx);
  ctx.fillRect(0, 0, horiz ? B : W, horiz ? H : B);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(tail, 0, 0);
  replace(scene, key, out);
}

/** Degradê para transparente nos últimos `px` pixels de baixo. */
function fadeBottom(scene, key, px) {
  if (!px || !scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  const out = canvas(src.width, src.height);
  const ctx = out.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const g = ctx.createLinearGradient(0, src.height - px, 0, src.height);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = g;
  ctx.fillRect(0, src.height - px, src.width, px);
  replace(scene, key, out);
}

/**
 * Reduz a copa (se for muito grande) e mede onde termina a massa de folhas:
 * o cipó se prende um pouco acima desse ponto, para sair "de dentro" da copa.
 */
function prepCanopy(scene, key, maxW) {
  if (!scene.textures.exists(key)) return 0.5;
  const src = scene.textures.get(key).getSourceImage();
  // medição numa cópia pequena
  const sw = 160;
  const sh = Math.max(1, Math.round((src.height * sw) / src.width));
  const small = canvas(sw, sh);
  const sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(src, 0, 0, sw, sh);
  const data = sctx.getImageData(0, 0, sw, sh).data;
  const rows = [];
  for (let y = 0; y < sh; y++) {
    let n = 0;
    for (let x = 0; x < sw; x++) if (data[(y * sw + x) * 4 + 3] > 128) n++;
    rows.push(n / sw);
  }
  const max = Math.max(...rows);
  let last = 0;
  for (let y = 0; y < sh; y++) if (rows[y] >= max * 0.75) last = y;
  const anchor = Math.min(0.75, Math.max(0.2, (last / sh) * 0.8));
  if (src.width > maxW) {
    const out = canvas(maxW, (src.height * maxW) / src.width);
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, out.width, out.height);
    replace(scene, key, out);
  }
  return anchor;
}

export function prepareArt(scene) {
  const art = scene.cache.json.get('art');
  const tiles = art.tiles ?? {};
  for (const [key, t] of Object.entries(tiles)) {
    if (key.startsWith('_')) continue;
    makeSeamless(scene, key, t.axis, t.blend ?? 0.15);
  }
  for (const kind of ['start', 'final']) fadeBottom(scene, `tree_${kind}`, art.trees?.[kind]?.fadeBottom);
  const maxW = Math.round((art.canopy?.displayWidth ?? 700) * 1.6);
  art.canopyAnchors = {};
  for (let i = 0; i < 4; i++) art.canopyAnchors[`canopy_${i}`] = prepCanopy(scene, `canopy_${i}`, maxW);
}
