/**
 * Процедурные диффузные карты (Canvas) для библиотеки материалов без внешних бинарников.
 * Пополнение: добавить генератор и запись в textureCatalog.
 */

import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace } from "three";

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  contrast: number,
  baseHue: number,
): void {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = rng();
    const v = 40 + n * contrast;
    d[i] = v;
    d[i + 1] = v * (0.92 + 0.08 * rng());
    d[i + 2] = v * (0.88 + 0.12 * rng());
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = "color";
  ctx.fillStyle = `hsla(${baseHue}, 35%, 50%, 0.35)`;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}

export type ProceduralTextureKind =
  | "wood"
  | "wood2"
  | "osb"
  | "brick"
  | "stone"
  | "plaster"
  | "roof"
  | "color"
  | "design";

export function renderProceduralDiffuseCanvas(kind: ProceduralTextureKind, seed: number): HTMLCanvasElement {
  const w = 256;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const rng = mulberry32(seed);

  if (kind === "wood" || kind === "wood2") {
    const vertical = kind === "wood";
    const nStrips = 8 + Math.floor(rng() * 6);
    ctx.fillStyle = `hsl(${28 + rng() * 18}, ${42 + rng() * 15}%, ${38 + rng() * 12}%)`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < nStrips; i++) {
      const t0 = i / nStrips;
      const t1 = (i + 1) / nStrips;
      const gx0 = vertical ? t0 * w : 0;
      const gy0 = vertical ? 0 : t0 * h;
      const gw = vertical ? (t1 - t0) * w : w;
      const gh = vertical ? h : (t1 - t0) * h;
      const grd = vertical
        ? ctx.createLinearGradient(gx0, 0, gx0 + gw, 0)
        : ctx.createLinearGradient(0, gy0, 0, gy0 + gh);
      const baseL = 32 + rng() * 18;
      grd.addColorStop(0, `hsl(${25 + rng() * 20}, 45%, ${baseL}%)`);
      grd.addColorStop(0.5, `hsl(${32 + rng() * 15}, 38%, ${baseL + 8}%)`);
      grd.addColorStop(1, `hsl(${22 + rng() * 18}, 50%, ${baseL - 6}%)`);
      ctx.fillStyle = grd;
      ctx.fillRect(gx0, gy0, gw, gh);
    }
    ctx.globalAlpha = 0.12;
    for (let k = 0; k < 400; k++) {
      ctx.fillStyle = rng() > 0.5 ? "#3a2a18" : "#c9a070";
      const x = rng() * w;
      const y = rng() * h;
      const lw = vertical ? 1 + rng() * 2 : 4 + rng() * 10;
      const lh = vertical ? 4 + rng() * 12 : 1 + rng() * 2;
      ctx.fillRect(x, y, lw, lh);
    }
    ctx.globalAlpha = 1;
    return c;
  }

  if (kind === "osb") {
    /** OSB: хаотично ориентированная щепа, жёлто-коричневый тон — не гладкий wood-grain. */
    const baseHue = 34 + (seed % 5);
    ctx.fillStyle = `hsl(${baseHue}, 46%, 56%)`;
    ctx.fillRect(0, 0, w, h);

    for (let p = 0; p < 48; p++) {
      const gx = rng() * w;
      const gy = rng() * h;
      const rad = 12 + rng() * 38;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      g.addColorStop(
        0,
        `hsla(${baseHue + (rng() - 0.5) * 10}, ${44 + rng() * 18}%, ${46 + rng() * 14}%, ${0.1 + rng() * 0.22})`,
      );
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    const drawStrand = (len: number, thick: number, cx: number, cy: number, ang: number, light: number, sat: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      const dh = (rng() - 0.5) * 12;
      ctx.fillStyle = `hsl(${baseHue + dh}, ${sat}%, ${light}%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.5, thick * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${baseHue + dh + 3}, ${sat + 5}%, ${light - 14}%, 0.55)`;
      ctx.beginPath();
      ctx.ellipse(len * 0.08, thick * 0.15, len * 0.42, thick * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    for (let i = 0; i < 340; i++) {
      const cx = rng() * (w + 24) - 12;
      const cy = rng() * (h + 24) - 12;
      const len = 7 + rng() * 26;
      const thick = 1.4 + rng() * 3.6;
      const ang = rng() * Math.PI;
      const light = 38 + rng() * 28;
      const sat = 38 + rng() * 32;
      drawStrand(len, thick, cx, cy, ang, light, sat);
    }

    for (let i = 0; i < 260; i++) {
      const cx = rng() * w;
      const cy = rng() * h;
      const rx = 1.1 + rng() * 3.2;
      const ry = 1.1 + rng() * 3.2;
      const ang = rng() * Math.PI;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = `hsl(${baseHue + (rng() - 0.5) * 16}, ${45 + rng() * 28}%, ${34 + rng() * 24}%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "rgba(45, 32, 14, 0.9)";
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 36; i++) {
      ctx.beginPath();
      ctx.moveTo(rng() * w, rng() * h);
      ctx.lineTo(rng() * w, rng() * h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `hsla(${baseHue + 6}, 35%, 65%, 0.12)`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";

    return c;
  }

  if (kind === "brick") {
    ctx.fillStyle = `hsl(${12 + rng() * 8}, 45%, 42%)`;
    ctx.fillRect(0, 0, w, h);
    const rows = 9;
    const cols = 6;
    const bh = h / rows;
    const bw = w / cols;
    for (let row = 0; row < rows; row++) {
      const off = row % 2 === 0 ? 0 : bw / 2;
      for (let col = -1; col < cols + 1; col++) {
        const x = col * bw + off;
        const y = row * bh;
        const shade = 0.88 + rng() * 0.14;
        ctx.fillStyle = `hsl(${10 + rng() * 12}, ${50 + rng() * 15}%, ${40 * shade}%)`;
        ctx.fillRect(x + 1, y + 1, bw - 3, bh - 3);
      }
    }
    ctx.strokeStyle = "rgba(30,18,12,0.35)";
    ctx.lineWidth = 1;
    for (let row = 0; row <= rows; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * bh);
      ctx.lineTo(w, row * bh);
      ctx.stroke();
    }
    return c;
  }

  if (kind === "stone") {
    fillNoise(ctx, w, h, rng, 120, 210 + seed % 40);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(${80 + rng() * 80}, ${80 + rng() * 70}, ${85 + rng() * 60}, ${0.25 + rng() * 0.25})`;
      ctx.beginPath();
      const cx = rng() * w;
      const cy = rng() * h;
      const rw = 20 + rng() * 50;
      const rh = 16 + rng() * 40;
      ctx.ellipse(cx, cy, rw, rh, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  if (kind === "plaster") {
    ctx.fillStyle = `hsl(${40 + rng() * 20}, 8%, ${88 - rng() * 8}%)`;
    ctx.fillRect(0, 0, w, h);
    fillNoise(ctx, w, h, rng, 25, 200);
    ctx.globalAlpha = 0.35;
    ctx.drawImage(c, 0, 0);
    ctx.globalAlpha = 1;
    return c;
  }

  if (kind === "roof") {
    const base = 200 + rng() * 40;
    ctx.fillStyle = `hsl(${base}, 12%, 32%)`;
    ctx.fillRect(0, 0, w, h);
    const wave = 10 + rng() * 6;
    for (let y = 0; y < h; y += wave) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + rng() * 0.08})`;
      ctx.fillRect(0, y + wave * 0.45, w, wave * 0.15);
      ctx.fillStyle = `rgba(255,255,255,${0.05 + rng() * 0.06})`;
      ctx.fillRect(0, y, w, wave * 0.2);
    }
    return c;
  }

  if (kind === "color") {
    const hue = (seed * 47) % 360;
    ctx.fillStyle = `hsl(${hue}, ${55 + rng() * 20}%, ${45 + rng() * 15}%)`;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * 0.35, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.7);
    g.addColorStop(0, `hsla(${(hue + 20) % 360}, 60%, 55%, 0.4)`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return c;
  }

  // design
  ctx.fillStyle = `hsl(${180 + rng() * 60}, 25%, ${86 - rng() * 10}%)`;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `hsla(${(seed * 11 + i * 30) % 360}, 40%, 45%, 0.35)`;
    ctx.lineWidth = 2 + rng() * 3;
    ctx.beginPath();
    ctx.moveTo(rng() * w, rng() * h);
    ctx.lineTo(rng() * w, rng() * h);
    ctx.stroke();
  }
  return c;
}

const threeTextureById = new Map<string, CanvasTexture>();
const previewDataUrlById = new Map<string, string>();

export function getCatalogDiffuseTexture(id: string, kind: ProceduralTextureKind, seed: number): CanvasTexture {
  let t = threeTextureById.get(id);
  if (t) {
    return t;
  }
  const canvas = renderProceduralDiffuseCanvas(kind, seed);
  t = new CanvasTexture(canvas);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  threeTextureById.set(id, t);
  return t;
}

export function getCatalogPreviewDataUrl(id: string, kind: ProceduralTextureKind, seed: number): string {
  const hit = previewDataUrlById.get(id);
  if (hit) {
    return hit;
  }
  const canvas = renderProceduralDiffuseCanvas(kind, seed);
  const url = canvas.toDataURL("image/png");
  previewDataUrlById.set(id, url);
  return url;
}

/** Для тестов / сброса кэша. */
export function __clearProceduralTextureTestCache(): void {
  for (const t of threeTextureById.values()) {
    t.dispose();
  }
  threeTextureById.clear();
  previewDataUrlById.clear();
}
