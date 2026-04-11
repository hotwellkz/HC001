import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";

import { computeAnchoredPopoverPosition } from "@/shared/ui/computeAnchoredPopoverPosition";
import { LucideToolIcon } from "@/shared/ui/LucideToolIcon";
import { useUiThemeStore, type UiColorScheme } from "@/store/useUiThemeStore";

import "./theme-menu.css";

function IconSunMoon({ scheme }: { readonly scheme: UiColorScheme }) {
  return (
    <LucideToolIcon
      icon={scheme === "light" ? Sun : Moon}
      className="tb-theme-icon"
      size={22}
    />
  );
}

export function ThemeMenu() {
  const colorScheme = useUiThemeStore((s) => s.colorScheme);
  const setColorScheme = useUiThemeStore((s) => s.setColorScheme);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const reposition = useCallback(() => {
    const btn = triggerRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) {
      return;
    }
    const anchor = btn.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    setPos(computeAnchoredPopoverPosition(anchor, w, h, window.innerWidth, window.innerHeight));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const menu = menuRef.current;
    const ro = menu ? new ResizeObserver(() => reposition()) : null;
    if (menu && ro) {
      ro.observe(menu);
    }
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
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
    <div className="tb-theme-wrap">
      <button
        ref={triggerRef}
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
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="tb-theme-popover tb-theme-popover--portal"
              style={{ left: pos.left, top: pos.top }}
              role="menu"
              aria-label="Выбор темы"
            >
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
