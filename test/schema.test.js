import { describe, expect, it } from 'vitest';
import { registry } from '../src/registry.js';
import { registrySchema } from '../src/protocol/schema.js';

describe('preregistration schema', () => {
  it('accepts the Phase 0A registry', () => {
    expect(registrySchema.safeParse(registry).success).toBe(true);
  });

  it('keeps prediction and implementation in separate modules', () => {
    const values = [];
    const visit = (value) => {
      values.push(value);
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') Object.values(value).forEach(visit);
    };
    visit(registry);
    expect(values.some((value) => typeof value === 'function')).toBe(false);
  });

  it('retains a structured excluded race row', () => {
    const row = registry.find(({ id }) => id === 'zero-timer-race-control').variants[0];
    expect(row.excluded).toBe(true);
    expect(row.exclusionReason).toEqual(expect.objectContaining({ code: 'timer-race' }));
  });
});
