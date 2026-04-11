import { useEffect, useRef } from "react";

import { useAppStore } from "@/store/useAppStore";

/**
 * Контекстное меню по ПКМ на объекте 3D. Расширяемо: добавляйте пункты role="menuitem".
 */
export function Editor3dEntityContextMenu() {
  const menu = useAppStore((s) => s.editor3dContextMenu);
  const close = useAppStore((s) => s.closeEditor3dContextMenu);
  const del = useAppStore((s) => s.deleteEntityFromEditor3dContextMenu);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) {
      return;
    }
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) {
        return;
      }
      close();
    };
    document.addEventListener("mousedown", onMouseDown, true);
    return () => document.removeEventListener("mousedown", onMouseDown, true);
  }, [menu, close]);

  if (!menu) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="ed2d-wall-ctx editor3d-entity-ctx"
      style={{ position: "fixed", left: menu.clientX, top: menu.clientY, zIndex: 60 }}
      role="menu"
      aria-label="Действия с объектом в 3D"
    >
      <button
        type="button"
        className="ed2d-wall-ctx__item"
        role="menuitem"
        onClick={() => {
          del();
        }}
      >
        Удалить
      </button>
    </div>
  );
}
