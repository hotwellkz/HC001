import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, FileDown, FilePlus2, FolderOpen, MoreHorizontal, Play } from "lucide-react";

import { LucideToolIcon } from "@/shared/ui/LucideToolIcon";
import { computeAnchoredPopoverPosition } from "@/shared/ui/computeAnchoredPopoverPosition";

export interface FileMenuItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: typeof FilePlus2;
  readonly disabled?: boolean;
  readonly hidden?: boolean;
  readonly onClick: () => void;
  readonly variant?: "default" | "accent";
}

export interface FileMenuSection {
  readonly id: string;
  readonly title?: string;
  readonly items: ReadonlyArray<FileMenuItem>;
}

/**
 * Меню локальных файловых и проектных действий: «Новый», «Открыть .sipproj»,
 * «Скачать .sipproj», «Сохранить в облако», «Демо». Отдельно от навигации, чтобы
 * не перегружать topbar.
 */
export function FileActionsMenu({
  sections,
  triggerLabel = "Файл",
  triggerIconOnly = false,
  align = "end",
}: {
  readonly sections: ReadonlyArray<FileMenuSection>;
  readonly triggerLabel?: string;
  readonly triggerIconOnly?: boolean;
  readonly align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  const reposition = useCallback(() => {
    const btn = triggerRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) {
      return;
    }
    const anchor = btn.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const computed = computeAnchoredPopoverPosition(anchor, w, h, window.innerWidth, window.innerHeight);
    if (align === "end") {
      const adjustedLeft = Math.min(Math.max(8, anchor.right - w), window.innerWidth - w - 8);
      setPos({ left: adjustedLeft, top: computed.top });
    } else {
      setPos(computed);
    }
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition, sections.length]);

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const ro = menu ? new ResizeObserver(() => reposition()) : null;
    if (menu && ro) ro.observe(menu);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visibleSections = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.hidden) }))
    .filter((s) => s.items.length > 0);

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerIconOnly ? "tb-file-trigger tb-file-trigger--icon" : "tb-file-trigger"}
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {triggerIconOnly ? (
          <LucideToolIcon icon={MoreHorizontal} className="tb-file-trigger-icon" />
        ) : (
          <>
            <span>{triggerLabel}</span>
            <LucideToolIcon icon={ChevronDown} className="tb-file-trigger-caret" />
          </>
        )}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="tb-file-popover"
              style={{ left: pos.left, top: pos.top }}
              role="menu"
              aria-label={triggerLabel}
            >
              {visibleSections.map((section, idx) => (
                <div key={section.id} className="tb-file-section">
                  {section.title ? <div className="tb-file-section-title">{section.title}</div> : null}
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className={`tb-file-item${item.variant === "accent" ? " tb-file-item--accent" : ""}`}
                      disabled={item.disabled}
                      onClick={() => {
                        if (item.disabled) return;
                        item.onClick();
                        setOpen(false);
                      }}
                    >
                      {item.icon ? <LucideToolIcon icon={item.icon} className="tb-file-item-icon" /> : null}
                      <span className="tb-file-item-main">
                        <span className="tb-file-item-label">{item.label}</span>
                        {item.description ? (
                          <span className="tb-file-item-desc">{item.description}</span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                  {idx < visibleSections.length - 1 ? <div className="tb-file-divider" aria-hidden /> : null}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export const FileMenuIcons = {
  newProject: FilePlus2,
  openLocal: FolderOpen,
  downloadLocal: FileDown,
  demo: Play,
} as const;
