import { useLayoutEffect } from "react";

import { applyColorSchemeToDocument, useUiThemeStore } from "@/store/useUiThemeStore";

/**
 * Поддерживает data-theme на <html> в синхроне с zustand persist.
 */
export function ThemeRoot({ children }: { readonly children: React.ReactNode }) {
  const colorScheme = useUiThemeStore((s) => s.colorScheme);

  useLayoutEffect(() => {
    applyColorSchemeToDocument(colorScheme);
  }, [colorScheme]);

  return children;
}
