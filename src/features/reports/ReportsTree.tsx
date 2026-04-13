import { useMemo } from "react";

import { REPORT_DEFINITIONS } from "@/core/reports/registry";
import { evaluateReportReadiness } from "@/core/reports/readiness";
import type { ReportDefinition, ReportStatus } from "@/core/reports/types";
import type { Project } from "@/core/domain/project";

import "./reports-workspace.css";

function statusDotClass(s: ReportStatus): string {
  switch (s) {
    case "ready":
      return "reports-tree__dot--ready";
    case "warning":
      return "reports-tree__dot--warn";
    case "blocked":
      return "reports-tree__dot--blocked";
    case "soon":
      return "reports-tree__dot--soon";
    default: {
      const _e: never = s;
      return _e;
    }
  }
}

function statusLabel(s: ReportStatus): string {
  switch (s) {
    case "ready":
      return "Готов";
    case "warning":
      return "Есть замечания";
    case "blocked":
      return "Нет данных";
    case "soon":
      return "Скоро";
    default: {
      const _e: never = s;
      return _e;
    }
  }
}

export interface ReportsTreeProps {
  readonly project: Project;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}

const SUBGROUP_TITLES: Record<string, string> = {
  starting_board: "Стартовая доска",
};

export function ReportsTree({ project, selectedId, onSelect }: ReportsTreeProps) {
  const groups = useMemo(() => {
    const m = new Map<string, ReportDefinition[]>();
    for (const d of REPORT_DEFINITIONS) {
      const arr = m.get(d.groupId) ?? [];
      arr.push(d);
      m.set(d.groupId, arr);
    }
    return m;
  }, []);

  const groupTitle: Record<string, string> = {
    cover: "ОБЛОЖКА",
    foundation: "Фундамент",
    walls: "СТЕНЫ",
  };

  return (
    <div className="reports-tree" role="tree">
      {[...groups.entries()].map(([gid, defs]) => {
        let lastSubgroup: string | undefined;
        return (
          <div key={gid} className="reports-tree__group" role="group">
            <div className="reports-tree__group-title">{groupTitle[gid] ?? gid}</div>
            <ul className="reports-tree__list">
              {defs.map((d) => {
                const sk = d.subgroupKey;
                const showSubgroupHeader = sk != null && sk !== lastSubgroup;
                if (sk !== lastSubgroup) {
                  lastSubgroup = sk;
                }
                const r = evaluateReportReadiness(project, d);
                const active = selectedId === d.id;
                const label = d.treeLabel ?? d.title;
                return (
                  <li key={d.id}>
                    {showSubgroupHeader ? (
                      <div className="reports-tree__subgroup-title">{SUBGROUP_TITLES[sk!] ?? sk}</div>
                    ) : null}
                    <button
                      type="button"
                      role="treeitem"
                      className={["reports-tree__item", active ? "reports-tree__item--active" : ""].filter(Boolean).join(" ")}
                      data-status={r.status}
                      onClick={() => onSelect(d.id)}
                    >
                      <span className={["reports-tree__dot", statusDotClass(r.status)].join(" ")} title={statusLabel(r.status)} />
                      <span className="reports-tree__label">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
