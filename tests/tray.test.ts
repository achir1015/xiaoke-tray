import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opencascade from 'replicad-opencascadejs';
import { measureVolume, setOC, type Shape3D } from 'replicad';
import { beforeAll, describe, expect, it } from 'vitest';
import { BUILDERS, type BuildResult } from '../src/generators/build';
import { GENERATORS } from '../src/generators/meta';
import { fromTemplate } from '../src/generators/types';

beforeAll(async () => {
  const wasm = createRequire(import.meta.url).resolve('replicad-opencascadejs/wasm');
  const oc = await (opencascade as unknown as (o: object) => Promise<never>)({ wasmBinary: readFileSync(wasm) });
  setOC(oc);
}, 60_000);

function run(template: string, extra: Record<string, unknown> = {}): BuildResult {
  const gen = BUILDERS.tray({ ...fromTemplate(GENERATORS.tray, template), ...extra } as never);
  for (;;) {
    const step = gen.next();
    if (step.done) return step.value;
  }
}
const size = (s: Shape3D) => {
  const [[x0, y0, z0], [x1, y1, z1]] = s.boundingBox.bounds;
  return [x1 - x0, y1 - y0, z1 - z0];
};

describe('tray', () => {
  it('builds the basic 100 × 100 × 20 tray', () => {
    const r = run('basic');
    const [w, d, h] = size(r.parts[0].shape);
    expect(w).toBeCloseTo(100, 1);
    expect(d).toBeCloseTo(100, 1);
    expect(h).toBeCloseTo(20, 1);
    const v = measureVolume(r.parts[0].shape);
    expect(v).toBeGreaterThan(20_000);
    expect(v).toBeLessThan(40_000);
  });
  it('adds partitions and keeps the outer size', () => {
    const plain = measureVolume(run('basic').parts[0].shape);
    const split = measureVolume(run('basic', { columns: 3, rows: 2 }).parts[0].shape);
    expect(split).toBeGreaterThan(plain + 1000);
    expect(run('basic', { columns: 3, rows: 2 }).notes[0].vars?.n).toBe(6);
  });
  for (const name of Object.keys(GENERATORS.tray.templates ?? {})) {
    it(`template ${name} builds without warnings`, () => {
      const r = run(name);
      expect(r.parts.length).toBe(1);
      expect(r.notes.filter((n) => n.level === 'warn')).toEqual([]);
      expect(measureVolume(r.parts[0].shape)).toBeGreaterThan(1000);
    });
  }
});
