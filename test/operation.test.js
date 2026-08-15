import { describe, expect, it, vi } from 'vitest';
import { OperationTimeoutError, runOperation } from '../src/harness/operation.js';

describe('unified operation wrapper', () => {
  it('always cleans up after success', async () => {
    const cleanup = vi.fn();
    const result = await runOperation({ label: 'success', timeoutMs: 50, execute: async () => 42, cleanup });
    expect(result.value).toBe(42);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('times out and still cleans up', async () => {
    const cleanup = vi.fn();
    await expect(runOperation({
      label: 'slow',
      timeoutMs: 5,
      execute: () => new Promise(() => {}),
      cleanup,
    })).rejects.toBeInstanceOf(OperationTimeoutError);
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
