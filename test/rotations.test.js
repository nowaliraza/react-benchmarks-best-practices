import { describe, expect, it } from 'vitest';
import { balancedRotations, positionCounts } from '../src/harness/rotations.js';

describe('balanced rotations', () => {
  it('preserves every variant exactly once in each rotation', () => {
    const variants = ['a', 'b', 'c', 'd'];
    const rotations = balancedRotations(variants, 5);
    expect(rotations).toHaveLength(5);
    for (const order of rotations) expect([...order].sort()).toEqual(variants);
  });

  it('records position counts for the manifest audit trail', () => {
    const counts = positionCounts(balancedRotations(['a', 'b'], 4));
    expect(counts.a.reduce((sum, count) => sum + count, 0)).toBe(4);
    expect(counts.b.reduce((sum, count) => sum + count, 0)).toBe(4);
  });
});
