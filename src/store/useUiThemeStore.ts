import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Предпочтение темы интерфейса (не часть проекта). */
export type UiColorScheme = "dark" | "light";

const STORAGE_KEY = "sip-hd-ui-v1";

function readStoredColorScheme(): UiColorScheme {
  if (typeof window === "undefined") {
    return "dark";
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return "dark";
    }
    const parsed = JSON.parse(raw) as { state?: { colorScheme?: string } };
    const s = parsed?.state?.colorScheme;
    if (s === "light" || s === "dark") {
      return s;
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

interface UiThemeState {
  readonly colorScheme: UiColorScheme;
  setColorScheme: (scheme: UiColorScheme) => void;
}

export const useUiThemeStore = create<UiThemeState>()(
  persist(
    (set) => ({
      colorScheme: readStoredColorScheme(),
      /**
       * Сначала обновляем data-theme на <html>, затем state — иначе подписчики
       * (Pixi paint, др.) вызываются до React useLayoutEffect и читают старые CSS-переменные.
       */
      setColorScheme: (colorScheme) => {
        applyColorSchemeToDocument(colorScheme);
        set({ colorScheme });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ colorScheme: s.colorScheme }),
    },
  ),
);

/** Синхронизация с <html data-theme> — вызывать из ThemeRoot при смене и при гидрации. */
export function applyColorSchemeToDocument(scheme: UiColorScheme): void {
  document.documentElement.setAttribute("data-theme", scheme);
  document.documentElement.style.colorScheme = scheme === "light" ? "light" : "dark";
}

/** Восстановление темы из localStorage до первого paint (см. main.tsx). */
export function bootstrapThemeFromStorage(): void {
  applyColorSchemeToDocument(readStoredColorScheme());
}
