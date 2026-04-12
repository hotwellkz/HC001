import { useCallback, useEffect } from "react";

import { initProjectPersistence } from "@/data/projectPersistence";
import { AppShell } from "@/features/ui/AppShell";
import { ThemeRoot } from "@/features/ui/ThemeRoot";
import { useAppStore } from "@/store/useAppStore";

function ErrorBanner() {
  const err = useAppStore((s) => s.lastError);
  const clear = useCallback(() => {
    useAppStore.setState({ lastError: null });
  }, []);

  if (!err) {
    return null;
  }

  return (
    <div className="ui-error-banner">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span>{err}</span>
        <button type="button" className="btn" onClick={clear}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

function InfoBanner() {
  const info = useAppStore((s) => s.infoMessage);
  const clear = useCallback(() => {
    useAppStore.setState({ infoMessage: null });
  }, []);

  useEffect(() => {
    if (!info) {
      return;
    }
    const t = window.setTimeout(() => clear(), 4500);
    return () => window.clearTimeout(t);
  }, [info, clear]);

  if (!info) {
    return null;
  }

  return (
    <div className="ui-info-banner" style={{ background: "var(--color-success-bg, #e8f5e9)", color: "var(--color-text, #111)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <span>{info}</span>
        <button type="button" className="btn" onClick={clear}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    void initProjectPersistence();
  }, []);

  return (
    <>
      <ThemeRoot>
        <AppShell />
      </ThemeRoot>
      <ErrorBanner />
      <InfoBanner />
    </>
  );
}
