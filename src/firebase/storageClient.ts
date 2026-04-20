import { getStorage, type FirebaseStorage } from "firebase/storage";

import { getFirebaseApp } from "./app";
import { isFirebaseConfigured } from "./config";

/**
 * Включаем Firebase Storage только если явно разрешено через VITE_FIREBASE_USE_STORAGE.
 * Иначе используем Firestore document (payloadJson) — не зависит от деплоя storage-rules
 * и не может «висеть» на uploadString при отсутствующем bucket / запрещающих правилах.
 */
function isStorageEnabled(): boolean {
  const flag = import.meta.env["VITE_FIREBASE_USE_STORAGE"];
  if (typeof flag !== "string") {
    return false;
  }
  const v = flag.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function tryGetFirebaseStorage(): FirebaseStorage | null {
  if (!isFirebaseConfigured() || !isStorageEnabled()) {
    return null;
  }
  try {
    return getStorage(getFirebaseApp());
  } catch {
    return null;
  }
}
