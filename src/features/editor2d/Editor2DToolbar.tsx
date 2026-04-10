import { projectCommands } from "@/features/project/commands";
import { useAppStore } from "@/store/useAppStore";

import "./editor2d-toolbar.css";

/** Lucide «mouse-pointer»: узнаваемый силуэт курсора, stroke для читаемости на 18px. */
function IconSelect() {
  return (
    <svg className="ed2d-icon ed2d-icon--stroke" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.25 2.5-2.5 6.25a.5.5 0 0 1-.894.035L4.688 5.288a.495.495 0 0 1-.651-.6z"
      />
    </svg>
  );
}

/** Панорамирование (четыре направления от центра). */
function IconPan() {
  return (
    <svg className="ed2d-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 4l2 3.5H10L12 4zm0 16l-2-3.5h4L12 20zM4 12l3.5-2v4L4 12zm16 0l-3.5 2v-4L20 12z"
      />
    </svg>
  );
}

/** Изменение длины: отрезок со стрелками к торцам. */
function IconChangeLength() {
  return (
    <svg className="ed2d-icon ed2d-icon--stroke" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14"
      />
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12l2.5-2M5 12l2.5 2M19 12l-2.5-2M19 12l-2.5 2"
      />
    </svg>
  );
}

/** Линейка: узкая полоса с делениями. */
function IconRuler() {
  return (
    <svg className="ed2d-icon ed2d-icon--stroke" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16.5L16.5 4l3.5 3.5L8 19.5H4v-3z"
      />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M7 13.5l1-1m2-2l1-1m2-2l1-1" />
    </svg>
  );
}

/** Карандаш / правка параметров выбранного объекта. */
function IconEdit() {
  return (
    <svg className="ed2d-icon ed2d-icon--stroke" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20h9M4 13l8-8a2 2 0 113 3l-8 8-4 1 1-4z"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="ed2d-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3v1H4v2h1v13a2 2 0 002 2h10a2 2 0 002-2V6h1V4h-5V3H9zm0 5h2v9H9V8zm4 0h2v9h-2V8z"
      />
    </svg>
  );
}

export function Editor2DToolbar() {
  const activeTool = useAppStore((s) => s.activeTool);
  const selectedCount = useAppStore((s) => s.selectedEntityIds.length);
  const setActiveTool = useAppStore((s) => s.setActiveTool);

  const deleteDisabled = selectedCount === 0;
  const editDisabled = selectedCount !== 1;
  const editTitle =
    selectedCount === 0
      ? "Редактировать — сначала выберите объект"
      : selectedCount > 1
        ? "Редактировать — только один объект"
        : "Редактировать";

  return (
    <div className="ed2d-toolbar" role="toolbar" aria-label="Инструменты 2D плана">
      <button
        type="button"
        className="ed2d-toolbtn"
        title="Выделение"
        aria-label="Выделение"
        aria-pressed={activeTool === "select"}
        data-active={activeTool === "select"}
        onClick={() => setActiveTool("select")}
      >
        <IconSelect />
      </button>
      <button
        type="button"
        className="ed2d-toolbtn"
        title="Панорама"
        aria-label="Панорама"
        aria-pressed={activeTool === "pan"}
        data-active={activeTool === "pan"}
        onClick={() => setActiveTool("pan")}
      >
        <IconPan />
      </button>
      <button
        type="button"
        className="ed2d-toolbtn"
        title="Изменение длины"
        aria-label="Изменение длины"
        aria-pressed={activeTool === "changeLength"}
        data-active={activeTool === "changeLength"}
        onClick={() => setActiveTool(activeTool === "changeLength" ? "select" : "changeLength")}
      >
        <IconChangeLength />
      </button>
      <button
        type="button"
        className="ed2d-toolbtn"
        title="Линейка — замер расстояний (мм). Esc — сброс"
        aria-label="Линейка"
        aria-pressed={activeTool === "ruler"}
        data-active={activeTool === "ruler"}
        onClick={() => setActiveTool("ruler")}
      >
        <IconRuler />
      </button>
      <button
        type="button"
        className="ed2d-toolbtn"
        title={editTitle}
        aria-label="Редактировать"
        disabled={editDisabled}
        onClick={() => projectCommands.openSelectedObjectEditor()}
      >
        <IconEdit />
      </button>
      <button
        type="button"
        className="ed2d-toolbtn ed2d-toolbtn--danger"
        title="Удалить"
        aria-label="Удалить"
        disabled={deleteDisabled}
        onClick={() => projectCommands.deleteSelected()}
      >
        <IconTrash />
      </button>
    </div>
  );
}
