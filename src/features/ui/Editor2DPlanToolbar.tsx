import { useAppStore } from "@/store/useAppStore";

import "./editor2d-plan-toolbar.css";

function IconWallAdd() {
  return (
    <svg className="e2dpt-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 20V10l8-5 8 5v10h-2v-8.5l-6-3.75-6 3.75V20H4zm9 0v-4h-2v4h2zm4-7V6h2v7h-2zM4 8V4h2v4H4z"
      />
    </svg>
  );
}

function IconWallJoint() {
  return (
    <svg className="e2dpt-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 20h16v-2H4v2zm0-8h10v-2H4v2zm0-6h6V4H4v2z" opacity="0.35" />
      <path
        fill="currentColor"
        d="M18 4v10h-2V7.5L9.5 4H18zm-1.5 12c.8 0 1.5.7 1.5 1.5S17.3 19 16.5 19 15 18.3 15 17.5 15.7 16 16.5 16z"
      />
    </svg>
  );
}

export function Editor2DPlanToolbar() {
  const open = useAppStore((s) => s.openAddWallModal);
  const openJoint = useAppStore((s) => s.openWallJointParamsModal);
  const wallToolActive = useAppStore((s) => s.wallPlacementSession != null);
  const jointModalOpen = useAppStore((s) => s.wallJointParamsModalOpen);
  const jointSession = useAppStore((s) => s.wallJointSession);

  return (
    <div className="e2dpt" role="toolbar" aria-label="Построение плана">
      <button
        type="button"
        className="e2dpt-btn"
        title={wallToolActive ? "Параметры стены (добавить ещё)" : "Добавить стену"}
        aria-label={wallToolActive ? "Параметры стены" : "Добавить стену"}
        aria-pressed={wallToolActive}
        data-active={wallToolActive}
        onClick={() => open()}
      >
        <IconWallAdd />
      </button>
      <button
        type="button"
        className="e2dpt-btn"
        title="Угловое соединение"
        aria-label="Угловое соединение"
        aria-pressed={jointModalOpen || jointSession != null}
        data-active={jointModalOpen || jointSession != null}
        onClick={() => openJoint()}
      >
        <IconWallJoint />
      </button>
    </div>
  );
}
