/**
 * Политика подписей расчётных досок на 2D-плане (только отображение).
 * Марки стен — wallMarks2d; размеры — dimensions.
 *
 * В обычном режиме подписи досок (EB/JB/UB/LB) не показываются — только при debug в настройках.
 */
export function shouldShowLumberPieceLabels2d(debugLumberPieceLabels2d: boolean): boolean {
  return debugLumberPieceLabels2d === true;
}
