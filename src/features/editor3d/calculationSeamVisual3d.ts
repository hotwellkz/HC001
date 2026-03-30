/**
 * Единый минималистичный стиль тонких швов расчёта в 3D (SIP-панели и доски).
 * Цвета чуть отличаются: швы досок слабее SIP, без «мультяшной» обводки.
 */
export const CALC_SEAM_VISUAL = {
  sip: {
    color: 0x2a2f36,
    roughness: 0.75,
    metalness: 0.02,
    polygonOffsetFactor: -1.5,
    polygonOffsetUnits: -1.5,
  },
  lumber: {
    color: 0x343c48,
    roughness: 0.78,
    metalness: 0.02,
    polygonOffsetFactor: -1.2,
    polygonOffsetUnits: -1.2,
  },
} as const;
