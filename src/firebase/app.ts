import { type Firestore, initializeFirestore } from "firebase/firestore";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";

import { getFirebaseWebConfig, isFirebaseConfigured } from "./config";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase не сконфигурирован");
  }
  if (!app) {
    const cfg = getFirebaseWebConfig();
    app = getApps().length ? getApps()[0]! : initializeApp(cfg);
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    // Long polling (XHR) вместо fetch/WebChannel по QUIC — уменьшает
    // net::ERR_QUIC_PROTOCOL_ERROR (QUIC_TOO_MANY_RTOS) в нестабильных сетях/браузерах.
    db = initializeFirestore(getFirebaseApp(), {
      experimentalForceLongPolling: true,
    });
  }
  return db;
}

export function tryGetFirestoreDb(): Firestore | null {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    return getFirestoreDb();
  } catch {
    return null;
  }
}
