import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleExternalMutation } from '../src/scenarios/index.js';

afterEach(() => vi.useRealTimers());

describe('external mutation scheduling fixture', () => {
  it('runs mutation from a host timer between supplied render chunk marks', async () => {
    vi.useFakeTimers();
    const order = [];
    order.push('first render chunk');
    scheduleExternalMutation({
      mark: (event) => order.push(event),
      mutate: () => order.push('store changed'),
    });
    await vi.runOnlyPendingTimersAsync();
    order.push('last render chunk of the first pass');
    order.push('commit');
    expect(order).toEqual([
      'first render chunk',
      'external mutation',
      'store changed',
      'last render chunk of the first pass',
      'commit',
    ]);
  });

  it('polls outside render until the first chunk probe becomes visible', async () => {
    vi.useFakeTimers();
    const order = [];
    let firstChunkSeen = false;
    scheduleExternalMutation({
      ready: () => firstChunkSeen,
      mark: (event) => order.push(event),
      mutate: () => order.push('store changed'),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual([]);
    firstChunkSeen = true;
    await vi.runOnlyPendingTimersAsync();
    expect(order).toEqual(['external mutation', 'store changed']);
  });
});
