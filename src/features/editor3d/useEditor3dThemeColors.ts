import { useLayoutEffect, useState } from "react";

import { useUiThemeStore } from "@/store/useUiThemeStore";

export interface Editor3dThemeColors {
  readonly bg: string;
  readonly section: string;
  readonly cell: string;
  readonly overlayBg: string;
  readonly overlayText: string;
}

function readEditor3dColorsFromDom(): Editor3dThemeColors {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  return {
    bg: cs.getPropertyValue("--color-editor3d-bg").trim() || "#0b0d12",
    section: cs.getPropertyValue("--color-editor3d-grid-section").trim() || "#3d4454",
    cell: cs.getPropertyValue("--color-editor3d-grid-cell").trim() || "#252a35",
    overlayBg: cs.getPropertyValue("--color-editor3d-overlay-bg").trim() || "rgba(15, 18, 24, 0.82)",
    overlayText: cs.getPropertyValue("--color-editor3d-overlay-text").trim() || "#e6e9ef",
  };
}

/** Цвета 3D сцены из CSS-переменных темы (пересчёт при смене light/dark). */
export function useEditor3dThemeColors(): Editor3dThemeColors {
  const scheme = useUiThemeStore((s) => s.colorScheme);
  const [colors, setColors] = useState<Editor3dThemeColors>(readEditor3dColorsFromDom);

  useLayoutEffect(() => {
    setColors(readEditor3dColorsFromDom());
  }, [scheme]);

  return colors;
}
