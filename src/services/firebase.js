/**
 * Inicialização preguiçosa do Firebase. Só carrega o SDK se as variáveis
 * VITE_FIREBASE_* existirem (ver .env.example). Sem elas, o jogo funciona
 * offline com ranking local.
 */
const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let ctxPromise = null;

export function getFirebase() {
  if (!firebaseEnabled) return Promise.resolve(null);
  if (!ctxPromise) ctxPromise = init().catch((err) => {
    console.warn('[firebase] indisponível, usando ranking local:', err?.message ?? err);
    ctxPromise = null;
    return null;
  });
  return ctxPromise;
}

async function init() {
  const [{ initializeApp }, authMod, fsMod, fnMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/functions'),
  ]);
  const app = initializeApp(config);

  // App Check (opcional, recomendado em produção)
  if (env.VITE_FIREBASE_APPCHECK_SITE_KEY) {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(env.VITE_FIREBASE_APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }

  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);
  const functions = fnMod.getFunctions(app, env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1');

  if (env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    fsMod.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    fnMod.connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }

  if (!auth.currentUser) await authMod.signInAnonymously(auth);

  return {
    app,
    auth,
    db,
    fs: fsMod,
    call: (name) => fnMod.httpsCallable(functions, name, { timeout: 15000 }),
  };
}
