import { useEffect, useState } from "react";
import { Keyboard, List, LogIn, Redo2, Undo2 } from "lucide-react";

import { Editor2DScopeToolbar } from "@/features/ui/Editor2DScopeToolbar";
import { Editor3DToolbar } from "@/features/ui/Editor3DToolbar";
import { LayerToolbar } from "@/features/ui/LayerToolbar";
import { ThemeMenu } from "@/features/ui/ThemeMenu";
import { TopBarMobile } from "@/features/ui/TopBarMobile";
import { WorkspaceModeTabs } from "@/features/ui/WorkspaceModeTabs";
import { CloudSaveButton } from "@/features/ui/topbar/CloudSaveButton";
import { FileActionsMenu, FileMenuIcons } from "@/features/ui/topbar/FileActionsMenu";
import { ProjectIdentityBlock, type StatusDensity } from "@/features/ui/topbar/ProjectIdentityBlock";
import { useTopBarController } from "@/features/ui/topbar/useTopBarController";
import { LucideToolIcon } from "@/shared/ui/LucideToolIcon";
import { useMobileLayout } from "@/shared/hooks/useMobileLayout";
import { useAppStore } from "@/store/useAppStore";
import { useEditorShortcutsStore } from "@/store/useEditorShortcutsStore";
import { Link } from "react-router-dom";

import "./top-bar.css";

type TopBarMode = "wide" | "comfortable" | "medium" | "narrow" | "compact";

/**
 * Desktop topbar разделён на 3 чётких блока:
 *  1) shell-top-left  — бренд + название проекта + бейдж статуса (cloud/local/guest)
 *  2) shell-top-center — контекстные инструменты режима (2D/3D/слои), отдельный слой
 *  3) shell-top-right — облачное сохранение, навигация по кабинету (Проекты/Команда/Выйти),
 *                       меню «Файл» и системные кнопки (undo/redo/тема/хоткеи/профили).
 *
 * Снизу — WorkspaceModeTabs (2D/3D/Спецификация/Стена/Отчёты).
 */
function getTopBarMode(width: number): TopBarMode {
  if (width < 920) return "compact";
  if (width < 1140) return "narrow";
  if (width < 1320) return "medium";
  if (width < 1520) return "comfortable";
  return "wide";
}

export function TopBar() {
  const isMobile = useMobileLayout();
  if (isMobile) {
    return <TopBarMobile />;
  }
  return <TopBarDesktop />;
}

function TopBarDesktop() {
  const { state, actions } = useTopBarController();

  const activeTab = useAppStore((s) => s.activeTab);
  const openProfiles = useAppStore((s) => s.openProfilesModal);
  const openHotkeys = useEditorShortcutsStore((s) => s.openShortcutsSettings);
  const canUndo = useAppStore((s) => s.history.past.length > 0);
  const canRedo = useAppStore((s) => s.history.future.length > 0);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);

  const [mode, setMode] = useState<TopBarMode>(() =>
    typeof window === "undefined" ? "wide" : getTopBarMode(window.innerWidth),
  );

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setMode((prev) => {
          const next = getTopBarMode(window.innerWidth);
          return prev === next ? prev : next;
        });
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const showLayerToolbar = mode === "wide" || mode === "comfortable" || mode === "medium";
  const wide = mode === "wide" || mode === "comfortable";
  const compact = mode === "compact";
  const cloudSaveIconOnly = mode === "narrow" || mode === "compact";

  // Плотность подписи статуса в левом блоке: чем уже шапка — тем короче подпись.
  const statusDensity: StatusDensity =
    mode === "wide" || mode === "comfortable"
      ? "full"
      : mode === "compact"
        ? "micro"
        : "compact";

  // Определяем кнопки навигации, которые видны напрямую vs. уходят в File menu.
  const navInline = wide;

  // Сборка пунктов File menu.
  const fileSections = [
    {
      id: "project",
      title: "Проект",
      items: [
        {
          id: "new",
          label: "Новый проект",
          description: "Создать пустой проект",
          icon: FileMenuIcons.newProject,
          onClick: actions.newProject,
        },
        {
          id: "open",
          label: "Открыть .sipproj",
          description: "Открыть локальный файл проекта",
          icon: FileMenuIcons.openLocal,
          onClick: actions.openLocalFile,
        },
        {
          id: "download",
          label: "Скачать .sipproj",
          description: "Скачать резервную копию на компьютер",
          icon: FileMenuIcons.downloadLocal,
          onClick: actions.downloadLocalFile,
        },
      ],
    },
    {
      id: "cloud",
      title: "Облако",
      items: [
        {
          id: "cloudSave",
          label: state.mode === "guest" ? "Войти и сохранить в облако" : "Сохранить в облако",
          description:
            state.mode === "cloud"
              ? "Сохранить сейчас в облаке"
              : state.mode === "local"
                ? "Импортировать локальный проект в облако"
                : "Откроется страница входа",
          icon: undefined,
          disabled: state.mode !== "guest" && !state.canCloudPersist,
          onClick: actions.onCloudSave,
        },
      ],
    },
    {
      id: "demo",
      items: [
        {
          id: "demo",
          label: "Демо",
          description: "Открыть демо-проект",
          icon: FileMenuIcons.demo,
          onClick: actions.openDemo,
        },
      ],
    },
    // На узких экранах добавляем сюда же навигацию кабинета,
    // чтобы не переполнять правую сторону.
    {
      id: "nav",
      title: !navInline ? "Кабинет" : undefined,
      items: navInline
        ? []
        : [
            {
              id: "projects",
              label: "Проекты",
              onClick: actions.goToProjects,
            },
            ...(state.showWorkspaceNav
              ? [
                  { id: "team", label: "Команда", onClick: actions.goToTeam },
                  { id: "logout", label: "Выйти", onClick: actions.onLogout },
                ]
              : [{ id: "login", label: "Войти", onClick: actions.goToLogin }]),
          ],
    },
    // Тулзы UI убираем в меню, если экран узкий.
    compact
      ? {
          id: "ui",
          title: "Интерфейс",
          items: [
            { id: "hotkeys", label: "Горячие клавиши", onClick: () => openHotkeys() },
            { id: "profiles", label: "Профили", onClick: () => openProfiles() },
          ],
        }
      : { id: "ui", items: [] },
  ];

  const cloudSaveDisabled =
    state.mode === "guest" ? false : !state.canCloudPersist;
  const cloudSaveLoading = state.statusKind === "cloud-saving";

  return (
    <header className="shell-top shell-top--with-mode-tabs" data-topbar-mode={mode}>
      <div className="shell-top-main">
        {/* === ЛЕВАЯ ЧАСТЬ: бренд / проект / статус === */}
        <div className="shell-top-left tb-group tb-group--left">
          <ProjectIdentityBlock
            projectName={state.projectName}
            dirty={state.dirty}
            statusKind={state.statusKind}
            statusTitle={state.statusTitle}
            isViewerRole={state.isViewerRole}
            statusDensity={statusDensity}
            hideViewerBadge={compact}
          />
        </div>

        {/* === ЦЕНТР: инструменты текущего режима (отдельный слой) === */}
        <div className="shell-top-center shell-top-tools tb-group tb-group--center">
          {activeTab === "2d" ? (
            <>
              <Editor2DScopeToolbar />
              {showLayerToolbar ? <LayerToolbar /> : null}
            </>
          ) : activeTab === "3d" ? (
            <Editor3DToolbar />
          ) : null}
        </div>

        {/* === ПРАВАЯ ЧАСТЬ: облако → навигация кабинета → меню Файл → системные === */}
        <div className="shell-top-right row tb-group tb-group--right">
          {state.showCloudSaveButton ? (
            <CloudSaveButton
              label={state.cloudSaveLabel}
              title={state.cloudSaveTitle}
              disabled={cloudSaveDisabled}
              loading={cloudSaveLoading}
              iconOnly={cloudSaveIconOnly}
              variant="primary"
              onClick={actions.onCloudSave}
            />
          ) : null}

          {navInline ? (
            <nav className="tb-nav-group" aria-label="Кабинет">
              <Link className="tb-nav-link" to="/app/projects" title="Перейти к проектам">
                Проекты
              </Link>
              {state.showWorkspaceNav ? (
                <>
                  <Link className="tb-nav-link" to="/app/team" title="Управление командой">
                    Команда
                  </Link>
                  <button
                    type="button"
                    className="tb-nav-link tb-nav-link--button"
                    onClick={actions.onLogout}
                    title="Выйти из аккаунта"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="tb-nav-link tb-nav-link--button tb-nav-link--accent"
                  onClick={actions.goToLogin}
                  title="Войти, чтобы сохранять проекты в облаке"
                >
                  <LucideToolIcon icon={LogIn} className="tb-keys-icon" />
                  <span>Войти</span>
                </button>
              )}
            </nav>
          ) : null}

          <FileActionsMenu sections={fileSections} triggerLabel="Файл" align="end" />

          <span className="tb-divider" aria-hidden />

          <button
            type="button"
            className="tb-prof-btn"
            title="Отменить (Cmd+Z / Ctrl+Z)"
            aria-label="Отменить"
            disabled={!canUndo}
            onClick={() => undo()}
          >
            <LucideToolIcon icon={Undo2} className="tb-keys-icon" />
          </button>
          <button
            type="button"
            className="tb-prof-btn"
            title="Повторить (Cmd+Shift+Z / Ctrl+Y / Ctrl+Shift+Z)"
            aria-label="Повторить"
            disabled={!canRedo}
            onClick={() => redo()}
          >
            <LucideToolIcon icon={Redo2} className="tb-keys-icon" />
          </button>

          {!compact ? (
            <button
              type="button"
              className="tb-prof-btn"
              title="Горячие клавиши"
              aria-label="Горячие клавиши"
              onClick={() => openHotkeys()}
            >
              <LucideToolIcon icon={Keyboard} className="tb-keys-icon" />
            </button>
          ) : null}
          <ThemeMenu />
          {!compact ? (
            <button
              type="button"
              className="tb-prof-btn"
              title="Профили"
              aria-label="Профили"
              onClick={() => openProfiles()}
            >
              <LucideToolIcon icon={List} className="tb-prof-icon" />
            </button>
          ) : null}
        </div>
      </div>
      <WorkspaceModeTabs />
    </header>
  );
}
