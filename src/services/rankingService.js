/**
 * Ranking: global (Firebase: Cloud Functions + Firestore) com queda
 * automática para ranking local (localStorage) quando offline/sem credenciais.
 *
 * Fluxo global:
 *   1. startRun()  → função "startRun" devolve { runId, seed } e registra o
 *                    horário de início no servidor.
 *   2. submitRun() → função "submitRun" regenera a fase pela semente, confere
 *                    itens/tempo/eventos, recalcula a pontuação e grava.
 *   O navegador NUNCA escreve direto na coleção de pontuações (regras do Firestore).
 */
import { getFirebase, firebaseEnabled } from './firebase.js';
import { storage } from './storage.js';
import { randomSeed } from '../core/rng.js';
import { compareRanking } from '../core/scoring.js';
import { LEVEL_VERSION } from '../core/constants.js';

export { firebaseEnabled };

export async function startRun() {
  const fb = await getFirebase();
  if (fb) {
    try {
      const res = await fb.call('startRun')({ levelVersion: LEVEL_VERSION });
      return { seed: res.data.seed >>> 0, runId: res.data.runId, mode: 'global' };
    } catch (err) {
      console.warn('[ranking] startRun falhou, partida será local:', err?.message ?? err);
    }
  }
  return { seed: randomSeed(), runId: null, mode: 'local' };
}

/**
 * @param result { name, timeMs, score, bananas, powerups, perfect, bonus, bananaIds, powerupIds, seed, runId, events }
 */
export async function submitRun(result) {
  const local = saveLocal(result);
  if (result.runId) {
    const fb = await getFirebase();
    if (fb) {
      try {
        const res = await fb.call('submitRun')({
          runId: result.runId,
          name: result.name,
          seed: result.seed,
          levelVersion: LEVEL_VERSION,
          timeMs: Math.round(result.timeMs),
          bananas: result.bananaIds,
          powerups: result.powerupIds,
          events: result.events,
        });
        return { mode: 'global', rank: res.data.rank, id: res.data.id };
      } catch (err) {
        console.warn('[ranking] envio global falhou:', err?.message ?? err);
        return { ...local, warning: 'não foi possível enviar ao ranking global' };
      }
    }
  }
  return local;
}

export async function getTop10() {
  const fb = await getFirebase();
  if (fb) {
    try {
      const { collection, query, where, orderBy, limit, getDocs } = fb.fs;
      const q = query(collection(fb.db, 'scores'), where('levelVersion', '==', LEVEL_VERSION), orderBy('score', 'desc'), orderBy('timeMs', 'asc'), limit(10));
      const snap = await getDocs(q);
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { entries, mode: 'global' };
    } catch (err) {
      console.warn('[ranking] leitura global falhou:', err?.message ?? err);
    }
  }
  return { entries: storage.getLocalRanking().filter(e => e.levelVersion === LEVEL_VERSION).slice(0, 10), mode: 'local' };
}

function saveLocal(r) {
  const entry = {
    id: `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: r.name,
    score: r.score,
    timeMs: Math.round(r.timeMs),
    bananas: r.bananas,
    powerups: r.powerups,
    perfect: r.perfect,
    bonus: r.bonus,
    date: Date.now(),
    levelVersion: LEVEL_VERSION,
  };
  const previous = storage.getLocalRanking();
  const list = [...previous.filter(e => e.levelVersion === LEVEL_VERSION), entry].sort(compareRanking).slice(0, 50);
  storage.setLocalRanking([...previous.filter(e => e.levelVersion !== LEVEL_VERSION), ...list]);
  const rank = list.findIndex((e) => e.id === entry.id) + 1;
  return { mode: 'local', rank: rank || null, id: entry.id };
}
