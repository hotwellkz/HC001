import type { LucideIcon } from "lucide-react";

const DEFAULT_SIZE = 18;
const STROKE = 1.65;

export type LucideToolIconProps = {
  readonly icon: LucideIcon;
  readonly className?: string;
  /** По умолчанию 18px; для триггеров шапки можно передать 22. */
  readonly size?: number;
};

/** Единый размер и толщина обводки для иконок инструментов (toolbar / rail). */
export function LucideToolIcon({ icon: Icon, className, size = DEFAULT_SIZE }: LucideToolIconProps) {
  return <Icon className={className} size={size} strokeWidth={STROKE} absoluteStrokeWidth aria-hidden />;
}
