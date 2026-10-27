/** Transições entre cenas compartilhadas por várias telas. */
import { startRun } from '../services/rankingService.js';
import { showLoading } from '../ui/screens.js';
import { clearUI, toast } from '../ui/dom.js';
import { AudioManager } from '../systems/AudioManager.js';
import { buildLevel } from '../core/levelGenerator.js';

const OVERLAYS = ['GameOver', 'Victory', 'Ranking'];

/** Para todas as cenas de jogo/overlay e inicia uma cena "principal". */
export function goTo(scene, key, data) {
  const mgr = scene.scene.manager;
  for (const k of [...OVERLAYS, 'Game', 'Menu']) {
    if (k !== key && (mgr.isActive(k) || mgr.isPaused(k))) mgr.stop(k);
  }
  clearUI();
  if (mgr.isActive(key)) mgr.stop(key);
  mgr.start(key, data);
}

/** Inicia uma partida: pede a semente ao servidor (ou gera localmente). */
export async function startGame(scene, name) {
  AudioManager.unlock();
  clearUI();
  const loading = showLoading();
  loading.progress(0.6);
  try {
    const run = await startRun();
    // Prepare os dados antes de fechar o menu e iniciar a cena do mundo.
    const level = buildLevel(run.seed);
    loading.progress(1);
    loading.remove();
    goTo(scene, 'Game', { name, run, level });
  } catch (error) {
    console.error('[startGame] falha ao iniciar a partida:', error);
    loading.remove();
    goTo(scene, 'Menu');
    toast('Não foi possível iniciar a partida. Tente novamente.', '#ffcc33', 6000);
  }
}
