import { Paintbrush } from "lucide-react";

import { LucideToolIcon } from "@/shared/ui/LucideToolIcon";
import { useAppStore } from "@/store/useAppStore";

import "./editor2d-plan-toolbar.css";

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
        <LucideToolIcon icon={Paintbrush} className="e2dpt-icon" />
      </button>
    </div>
  );
}
