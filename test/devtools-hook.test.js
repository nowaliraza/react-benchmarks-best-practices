import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function runInlineHook(search, existingHook) {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error('Expected the pre-React DevTools hook script.');
  const window = existingHook ? { __REACT_DEVTOOLS_GLOBAL_HOOK__: existingHook } : {};
  vm.runInNewContext(script, {
    window,
    location: { search },
    performance: { now: () => 1 },
    Map,
    Set,
    URLSearchParams,
  });
  return window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
}

describe('development DevTools hook boundary', () => {
  it('leaves the viewer realm for React Refresh to initialize', () => {
    expect(runInlineHook('')).toBeUndefined();
    const refreshHook = { renderers: new Map(), inject() {} };
    expect(runInlineHook('', refreshHook)).toBe(refreshHook);
  });

  it('provides React Refresh-compatible renderer state in a measured realm', () => {
    const hook = runInlineHook('?scenario=micro-calibration&variant=light&pass=exact');
    expect(hook.renderers).toBeInstanceOf(Map);
    expect(() => hook.renderers.forEach(() => {})).not.toThrow();
    expect(hook.inject({ renderer: true })).toBe(1);
    expect(hook.renderers.size).toBe(1);
  });
});
