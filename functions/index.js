/**
 * Cloud Functions do ranking global do Monkey Fast.
 *
 *  startRun  → cria uma partida no servidor (semente + horário de início).
 *  submitRun → valida o resultado e grava em "scores" (única forma de escrever lá).
 *
 * Validações aplicadas (ver shared/validation.js):
 *  - usuário autenticado (anônimo) e dono da partida; partida usada uma única vez
 *  - fase regenerada pela semente: cada banana/power-up enviado precisa existir
 *  - pontuação recalculada no servidor (o valor do cliente é ignorado)
 *  - tempo ≥ mínimo físico e ≤ tempo medido pelo servidor desde o startRun
 *  - eventos em ordem e itens coletados no trecho certo da fase
 *  - limite de frequência por usuário
 * Limitação conhecida: não há replay determinístico da partida inteira, então
 * um cliente modificado ainda poderia forjar uma partida "plausível".
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import { validateRunResult, sanitizeName } from './shared/validation.js';
import { LEVEL_VERSION } from './shared/constants.js';

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: process.env.FUNCTIONS_REGION || 'us-central1', maxInstances: 10, memory: '256MiB' });

const callOpts = { enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', cors: true };
const START_COOLDOWN_MS = 2000;
const SUBMIT_COOLDOWN_MS = 10000;

function requireAuth(req) {
  if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Faça login (anônimo) para jogar no ranking.');
  return req.auth.uid;
}

/** Limite simples de frequência por usuário (documento users/{uid}). */
async function rateLimit(uid, field, cooldownMs) {
  const ref = db.collection('users').doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const last = snap.exists ? snap.get(field)?.toMillis?.() ?? 0 : 0;
    if (Date.now() - last < cooldownMs) throw new HttpsError('resource-exhausted', 'Muitas requisições. Aguarde alguns segundos.');
    tx.set(ref, { [field]: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export const startRun = onCall(callOpts, async (req) => {
  const uid = requireAuth(req);
  if (req.data?.levelVersion && req.data.levelVersion !== LEVEL_VERSION) {
    throw new HttpsError('failed-precondition', 'Versão do jogo desatualizada. Recarregue a página.');
  }
  await rateLimit(uid, 'lastStart', START_COOLDOWN_MS);
  const seed = randomInt(0, 2 ** 32);
  const ref = db.collection('runs').doc();
  await ref.set({ uid, seed, levelVersion: LEVEL_VERSION, startedAt: FieldValue.serverTimestamp(), used: false });
  return { runId: ref.id, seed };
});

export const submitRun = onCall(callOpts, async (req) => {
  const uid = requireAuth(req);
  const data = req.data ?? {};
  if (typeof data.runId !== 'string' || !data.runId) throw new HttpsError('invalid-argument', 'Partida inválida.');
  await rateLimit(uid, 'lastSubmit', SUBMIT_COOLDOWN_MS);

  const runRef = db.collection('runs').doc(data.runId);
  const scoreRef = db.collection('scores').doc();

  const entry = await db.runTransaction(async (tx) => {
    const run = await tx.get(runRef);
    if (!run.exists) throw new HttpsError('not-found', 'Partida não encontrada.');
    if (run.get('uid') !== uid) throw new HttpsError('permission-denied', 'Esta partida pertence a outro jogador.');
    if (run.get('used')) throw new HttpsError('already-exists', 'Resultado já enviado.');
    if (Number(data.seed) !== run.get('seed')) throw new HttpsError('failed-precondition', 'Semente não confere.');

    const startedAt = run.get('startedAt')?.toMillis?.() ?? Date.now();
    const serverElapsedMs = Date.now() - startedAt;
    const v = validateRunResult(
      {
        name: data.name,
        seed: run.get('seed'),
        levelVersion: data.levelVersion,
        timeMs: data.timeMs,
        bananas: data.bananas,
        powerups: data.powerups,
        events: Array.isArray(data.events) ? data.events.slice(0, 2000) : [],
      },
      { serverElapsedMs },
    );
    if (!v.ok) {
      tx.update(runRef, { used: true, rejected: v.errors.slice(0, 10) });
      throw new HttpsError('failed-precondition', `Resultado recusado: ${v.errors.join('; ')}`);
    }
    const doc = {
      name: sanitizeName(data.name),
      score: v.score.total,
      basic: v.score.basic,
      bonus: v.score.bonus,
      perfect: v.score.perfect,
      timeMs: Math.round(Number(data.timeMs)),
      bananas: data.bananas.length,
      powerups: data.powerups.length,
      levelVersion: LEVEL_VERSION,
      date: FieldValue.serverTimestamp(),
      uid,
      runId: data.runId,
    };
    tx.set(scoreRef, doc);
    tx.update(runRef, { used: true, scoreId: scoreRef.id });
    return doc;
  });

  // posição = quantos estão à frente + 1 (maior pontuação; empate → menor tempo)
  const scores = db.collection('scores').where('levelVersion', '==', LEVEL_VERSION);
  const [higher, tiedFaster] = await Promise.all([
    scores.where('score', '>', entry.score).count().get(),
    scores.where('score', '==', entry.score).where('timeMs', '<', entry.timeMs).count().get(),
  ]);
  const rank = higher.data().count + tiedFaster.data().count + 1;
  return { id: scoreRef.id, rank, score: entry.score };
});
