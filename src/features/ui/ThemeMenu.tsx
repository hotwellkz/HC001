import { useEffect, useRef, useState } from "react";

import { useUiThemeStore, type UiColorScheme } from "@/store/useUiThemeStore";

import "./theme-menu.css";

function IconSunMoon({ scheme }: { readonly scheme: UiColorScheme }) {
  if (scheme === "light") {
    return (
      <svg className="tb-theme-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM11 3h2v2h-2V3zm0 16h2v2h-2v-2zM3 11h2v2H3v-2zm16 0h2v2h-2v-2zM5.64 5.64l1.41 1.41L6.34 8.4 4.93 6.99l1.41-1.35zm12.02 12.02-1.41-1.41 1.41-1.41 1.41 1.41-1.41 1.41zM18.36 5.64l-1.41 1.41-1.41-1.41 1.41-1.41 1.41 1.41zM6.34 15.6l-1.41 1.41-1.35-1.41 1.41-1.41 1.35 1.41z"
        />
      </svg>
    );
  }
  return (
    <svg className="tb-theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.37 5.51A7.5 7.5 0 0 0 18.49 15.63 9 9 0 1 1 9.37 5.51z"
      />
    </svg>
  );
}

export function ThemeMenu() {
  const colorScheme = useUiThemeStore((s) => s.colorScheme);
  const setColorScheme = useUiThemeStore((s) => s.setColorScheme);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (scheme: UiColorScheme) => {
    setColorScheme(scheme);
    setOpen(false);
  };

  return (
    <div className="tb-theme-wrap" ref={wrapRef}>
      <button
        type="button"
        className="tb-theme-trigger"
        title="Тема оформления"
        aria-label="Тема оформления"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconSunMoon scheme={colorScheme} />
      </button>
      {open ? (
        <div className="tb-theme-popover" role="menu" aria-label="Выбор темы">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={colorScheme === "dark"}
            className="tb-theme-item"
            onClick={() => select("dark")}
          >
            <span className="tb-theme-item__dot" data-on={colorScheme === "dark"} />
            Тёмная тема
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={colorScheme === "light"}
            className="tb-theme-item"
            onClick={() => select("light")}
          >
            <span className="tb-theme-item__dot" data-on={colorScheme === "light"} />
            Светлая тема
          </button>
        </div>
      ) : null}
    </div>
  );
}
