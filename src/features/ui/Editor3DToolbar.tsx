import { useAppStore } from "@/store/useAppStore";

import "./editor2d-plan-toolbar.css";

function IconApplyTexture() {
  return (
    <svg className="e2dpt-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm13 0c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"
        opacity="0.35"
      />
      <path
        fill="currentColor"
        d="M6 6h3v3H6V6zm9 0h3v3h-3V6zM6 15h3v3H6v-3zm11 3h2v2h-2v-2zm-1-3h2v2h-2v-2z"
      />
    </svg>
  );
}

export function Editor3DToolbar() {
  const toggleTextureApply3dTool = useAppStore((s) => s.toggleTextureApply3dTool);
  const active = useAppStore((s) => s.textureApply3dToolActive);

  return (
    <div className="e2dpt" role="toolbar" aria-label="Инструменты 3D">
      <button
        type="button"
        className="e2dpt-btn"
        title="Применить текстуру (raycast по объектам)"
        aria-label="Применить текстуру"
        aria-pressed={active}
        data-active={active}
        onClick={() => toggleTextureApply3dTool()}
      >
        <IconApplyTexture />
      </button>
    </div>
  );
}
