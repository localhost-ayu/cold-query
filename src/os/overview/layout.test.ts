import { describe, expect, it } from 'vitest';

import { layoutOverview } from './layout';

const area = { x: 0, y: 100, width: 1200, height: 600 };
const window = { x: 50, y: 50, width: 1000, height: 600 };

function inside(slot: { x: number; y: number; scale: number }, w = window) {
  return (
    slot.x >= area.x &&
    slot.y >= area.y &&
    slot.x + w.width * slot.scale <= area.x + area.width + 1 &&
    slot.y + w.height * slot.scale <= area.y + area.height + 1
  );
}

describe('layoutOverview', () => {
  it('returns nothing for an empty desktop', () => {
    expect(layoutOverview([], area)).toEqual([]);
  });

  it('shrinks a single window to fit and centers it', () => {
    const [slot] = layoutOverview([window], area);
    expect(slot.scale).toBeLessThan(1);
    expect(inside(slot)).toBe(true);
    const center = slot.x + (window.width * slot.scale) / 2;
    expect(Math.abs(center - 600)).toBeLessThanOrEqual(1);
  });

  it('never enlarges small windows', () => {
    const small = { x: 0, y: 0, width: 200, height: 100 };
    expect(layoutOverview([small], area)[0].scale).toBe(1);
  });

  it('keeps every window inside the area without overlapping', () => {
    const windows = Array.from({ length: 5 }, () => window);
    const slots = layoutOverview(windows, area);
    expect(slots.every((slot) => inside(slot))).toBe(true);
    for (let a = 0; a < slots.length; a += 1) {
      for (let b = a + 1; b < slots.length; b += 1) {
        const A = slots[a];
        const B = slots[b];
        const overlap =
          A.x < B.x + window.width * B.scale &&
          B.x < A.x + window.width * A.scale &&
          A.y < B.y + window.height * B.scale &&
          B.y < A.y + window.height * A.scale;
        expect(overlap).toBe(false);
      }
    }
  });
});
