/** Назначенная текстура из библиотеки + масштаб относительно каталожного defaultScale. */
export interface SurfaceTextureBinding {
  readonly textureId: string;
  /** 100 = как в каталоге; 50 — мельче (чаще повтор); 200 — крупнее. */
  readonly scalePercent: number;
}
