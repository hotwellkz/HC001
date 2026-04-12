import { BufferGeometry, Float32BufferAttribute } from "three";

const MM_TO_M = 0.001;

/**
 * Разворачивает индексированные треугольники в «soup»: у каждого треугольника свои 3 вершины.
 * Тогда {@link BufferGeometry.computeVertexNormals} даёт нормали граней без усреднения между
 * смежными гранями под 90° — без мерцания и ложных диагоналей на плоских участках.
 */
function indexedTrianglesToNonIndexed(geo: BufferGeometry): BufferGeometry {
  const index = geo.getIndex();
  const pos = geo.getAttribute("position");
  if (!index || !pos) {
    return geo;
  }
  const n = index.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const vi = index.getX(i);
    arr[i * 3] = pos.getX(vi)!;
    arr[i * 3 + 1] = pos.getY(vi)!;
    arr[i * 3 + 2] = pos.getZ(vi)!;
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new Float32BufferAttribute(arr, 3));
  return out;
}

function finalizePrismGeometry(geo: BufferGeometry): BufferGeometry {
  if (!geo.getIndex()) {
    geo.computeVertexNormals();
    return geo;
  }
  const nonIndexed = indexedTrianglesToNonIndexed(geo);
  nonIndexed.computeVertexNormals();
  geo.dispose();
  return nonIndexed;
}

/**
 * Призма стены: нижнее основание прямоугольник, верх — наклонная плоскость (высоты h0/h1 у −depth/2 и +depth/2 по локальной Z).
 * Локально: X — толщина, Y — вверх, Z — вдоль стены (как у boxGeometry стены).
 */
export function buildWallSlopedPrismGeometry(
  widthM: number,
  depthM: number,
  heightStartM: number,
  heightEndM: number,
): BufferGeometry {
  const w2 = widthM / 2;
  const d2 = depthM / 2;
  const h0 = heightStartM;
  const h1 = heightEndM;
  const y = (z: number): number => {
    const t = (z + d2) / depthM;
    return h0 + (h1 - h0) * t;
  };

  const v: number[] = [];
  const pushV = (x: number, yy: number, z: number): void => {
    v.push(x, yy, z);
  };

  // bottom 0…3: z = -d2, +d2 corners
  pushV(-w2, 0, -d2);
  pushV(w2, 0, -d2);
  pushV(w2, 0, d2);
  pushV(-w2, 0, d2);
  // top 4…7
  pushV(-w2, y(-d2), -d2);
  pushV(w2, y(-d2), -d2);
  pushV(w2, y(d2), d2);
  pushV(-w2, y(d2), d2);

  const positions = new Float32Array(v);
  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip?: boolean): void => {
    if (flip) {
      indices.push(a, c, b, b, c, d);
    } else {
      indices.push(a, b, c, b, d, c);
    }
  };

  quad(0, 1, 2, 3, true);
  quad(4, 5, 6, 7, false);
  quad(0, 1, 5, 4, false);
  quad(2, 3, 7, 6, true);
  quad(0, 3, 7, 4, false);
  quad(1, 2, 6, 5, true);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return finalizePrismGeometry(geo);
}

export function wallSlopedBoundingHeightM(heightStartM: number, heightEndM: number): number {
  return Math.max(heightStartM, heightEndM);
}

/**
 * Призма стены с произвольным верхним контуром в плоскости фасада (ось Z — вдоль стены, Y — вверх).
 * `profileZM` и `profileHeightM` одинаковой длины ≥ 2; z от −depth/2 (старт стены) до +depth/2.
 */
export function buildWallSlopedProfilePrismGeometry(
  widthM: number,
  depthM: number,
  profileZM: readonly number[],
  profileHeightM: readonly number[],
): BufferGeometry {
  const n = profileZM.length;
  if (n < 2 || profileHeightM.length !== n) {
    const h0 = profileHeightM[0] ?? 0;
    const h1 = profileHeightM[n - 1] ?? h0;
    return buildWallSlopedPrismGeometry(widthM, depthM, h0, h1);
  }

  const w2 = widthM / 2;
  const v: number[] = [];
  const pushV = (x: number, yy: number, z: number): void => {
    v.push(x, yy, z);
  };

  for (let i = 0; i < n; i++) {
    pushV(-w2, 0, profileZM[i]!);
    pushV(w2, 0, profileZM[i]!);
  }
  for (let i = 0; i < n; i++) {
    pushV(-w2, profileHeightM[i]!, profileZM[i]!);
    pushV(w2, profileHeightM[i]!, profileZM[i]!);
  }

  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip?: boolean): void => {
    if (flip) {
      indices.push(a, c, b, a, d, c);
    } else {
      indices.push(a, b, c, a, c, d);
    }
  };

  const lb = (i: number) => 2 * i;
  const rb = (i: number) => 2 * i + 1;
  const lt = (i: number) => 2 * n + 2 * i;
  const rt = (i: number) => 2 * n + 2 * i + 1;

  /** Низ y=0: полоса четырёхугольников вдоль Z (одна грань на весь span давала дыры при n>2). */
  for (let i = 0; i < n - 1; i++) {
    quad(lb(i), rb(i), rb(i + 1), lb(i + 1), true);
  }

  for (let i = 0; i < n - 1; i++) {
    quad(lb(i), lb(i + 1), lt(i + 1), lt(i), false);
    quad(rb(i), rt(i), rt(i + 1), rb(i + 1), true);
    quad(lt(i), rt(i), rt(i + 1), lt(i + 1), false);
  }

  quad(lb(0), lt(0), rt(0), rb(0), false);
  quad(lb(n - 1), rb(n - 1), rt(n - 1), lt(n - 1), false);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(v), 3));
  geo.setIndex(indices);
  return finalizePrismGeometry(geo);
}

export { MM_TO_M };
