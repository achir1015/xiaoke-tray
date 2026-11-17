// 小柯托盤：參數化便當／分格托盤（類似 Bambu MakerLab Bento3D 的操作方式，幾何為原創實作）。
import { draw, makeBaseBox, type Shape3D, type Sketch } from 'replicad';
import type { Note } from '../types';
import { cutAll, fuseAll, ParamError, patternCells, prism, round1, roundedBox, roundedRect, type Build, type Pattern } from './common';

export interface TrayParams {
  width: number;
  depth: number;
  height: number;
  wall: number;
  floor: number;
  fillet: number;
  layout: 'grid' | 'custom';
  columns: number;
  rows: number;
  colRatios: string;
  rowRatios: string;
  partitionHeight: number;
  partitionWall: number;
  stack: 'none' | 'stackable';
  stackLip: number;
  stackGap: number;
  fingerPull: 'none' | 'front' | 'frontback';
  pullWidth: number;
  pullDepth: number;
  label: boolean;
  labelDepth: number;
  pattern: 'none' | Pattern;
  patternSize: number;
  patternGap: number;
}

/** Sizes along one axis: equal cells or the ratios the user typed. */
function spans(total: number, count: number, ratios: string, custom: boolean): number[] {
  if (!custom) return Array.from({ length: Math.max(1, Math.round(count)) }, () => total / Math.max(1, Math.round(count)));
  const list = ratios.split(/[,; ]+/).map(Number).filter((v) => v > 0);
  const parts = list.length ? list : [1];
  const sum = parts.reduce((a, b) => a + b, 0);
  return parts.map((v) => (total * v) / sum);
}

export function* buildTray(p: TrayParams): Build {
  const notes: Note[] = [];
  const t = p.wall;
  const W = p.width;
  const D = p.depth;
  const stackable = p.stack === 'stackable';
  const lip = stackable ? Math.min(p.stackLip, p.height / 2) : 0;
  const H = p.height;
  const floor = Math.min(p.floor, H - lip - 1);
  if (Math.min(W, D) < 2 * t + 6) throw new ParamError('err.boxTooSmall');
  const r = Math.max(0, Math.min(p.fillet, Math.min(W, D) / 2 - 0.5));

  // 外形：可堆疊時底部縮一圈，剛好插進下一個托盤的開口。
  let outer = roundedBox(W, D, r, H - lip, lip);
  if (lip > 0) {
    const inset = t + p.stackGap;
    const foot = roundedBox(W - 2 * inset, D - 2 * inset, Math.max(0, r - inset), lip + 0.01, 0);
    outer = outer.fuse(foot) as Shape3D;
  }
  yield { label: 'stage.outer', parts: [{ name: 'tray', shape: outer }] };

  const innerW = W - 2 * t;
  const innerD = D - 2 * t;
  let tray = outer.cut(roundedBox(innerW, innerD, Math.max(0, r - t), H, lip + floor)) as Shape3D;
  yield { label: 'stage.hollow', parts: [{ name: 'tray', shape: tray }] };

  // 底板鏤空花紋（排水孔、蜂巢等）
  if (p.pattern !== 'none') {
    const m = t + Math.max(2, r * 0.3) + (lip > 0 ? p.stackGap + 1 : 0);
    const { cells: holes } = patternCells(p.pattern, p.patternSize, p.patternGap, p.patternSize * 3, W - 2 * m, D - 2 * m, () => true);
    if (!holes.length) notes.push({ level: 'warn', key: 'note.noRoomDrain' });
    tray = cutAll(tray, holes.map((c) => prism(c.drawing.translate(c.x, c.y), H + 2, -1)));
  }

  // 隔板
  const custom = p.layout === 'custom';
  const cols = spans(innerW, p.columns, p.colRatios, custom);
  const rows = spans(innerD, p.rows, p.rowRatios, custom);
  const pw = Math.max(0.4, p.partitionWall);
  const ph = Math.min(H, Math.max(lip + floor + 1, p.partitionHeight));
  const adds: Shape3D[] = [];
  let x = -innerW / 2;
  for (const w of cols.slice(0, -1)) {
    x += w;
    adds.push(makeBaseBox(pw, innerD + 0.02, ph - lip - floor + 0.01).translate(x, 0, lip + floor - 0.01));
  }
  let y = -innerD / 2;
  for (const d of rows.slice(0, -1)) {
    y += d;
    adds.push(makeBaseBox(innerW + 0.02, pw, ph - lip - floor + 0.01).translate(0, y, lip + floor - 0.01));
  }
  if (Math.min(...cols, ...rows) < pw + 4) notes.push({ level: 'warn', key: 'note.trayCellSmall' });

  // 標籤斜台（後壁）
  if (p.label) {
    const d = Math.min(p.labelDepth, H - lip - floor - 1, D / 3);
    const yy = D / 2 - t / 2;
    const ledge = (draw([yy, H]).lineTo([yy - d, H]).lineTo([yy, H - d]).close().sketchOnPlane('YZ', -W / 2 + t / 2) as Sketch).extrude(W - t) as Shape3D;
    adds.push(ledge.intersect(outer) as Shape3D);
  }
  if (adds.length) {
    tray = tray.fuse(fuseAll(adds)) as Shape3D;
    yield { label: 'stage.partitions', parts: [{ name: 'tray', shape: tray }] };
  }

  // 指扣缺口
  if (p.fingerPull !== 'none') {
    const gd = Math.min(p.pullDepth, H - lip - floor - 2);
    const cuts: Shape3D[] = [];
    for (const angle of p.fingerPull === 'front' ? [0] : [0, 180]) {
      const gw = Math.min(p.pullWidth, W - 2 * r - 2 * t - 2);
      if (gw < 6 || gd < 2) {
        notes.push({ level: 'warn', key: 'note.noRoomGrip' });
        break;
      }
      cuts.push(
        prism(roundedRect(gw, 2 * gd, Math.min(gd, gw / 2) * 0.6), t + 2, -1)
          .rotate(90, [0, 0, 0], [1, 0, 0])
          .translate(0, -D / 2 + t, H)
          .rotate(angle, [0, 0, 0], [0, 0, 1]),
      );
    }
    tray = cutAll(tray, cuts);
  }

  const cells = cols.length * rows.length;
  notes.unshift({ level: 'info', key: 'note.trayInfo', vars: { w: round1(W), d: round1(D), h: round1(H), n: cells } });
  if (stackable) notes.push({ level: 'info', key: 'note.trayStack', vars: { l: round1(lip) } });
  return { parts: [{ name: 'tray', shape: tray }], notes };
}
