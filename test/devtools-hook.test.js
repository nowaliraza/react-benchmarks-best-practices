import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { isMeasuredRealm } from '../src/realm.js';

function inlineHookSource() {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  // Select the hook script by its content rather than by position, so an inline
  // script added ahead of it cannot silently redirect this test at other code.
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(([, body]) => body)
    .find((body) => body.includes('__REACT_DEVTOOLS_GLOBAL_HOOK__'));
  if (!script) throw new Error('Expected the pre-React DevTools hook script.');
  return script;
}

function runInlineHook(search, existingHook) {
  const window = existingHook ? { __REACT_DEVTOOLS_GLOBAL_HOOK__: existingHook } : {};
  vm.runInNewContext(inlineHookSource(), {
    window,
    location: { search },
    performance: { now: () => 1 },
    Map,
    Set,
    URLSearchParams,
  });
  return window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
}

const realmCases = [
  '',
  '?scenario=',
  '?scenario=micro-calibration',
  '?scenario=micro-calibration&variant=light',
  '?scenario=micro-calibration&variant=light&pass=',
  '?scenario=&variant=light&pass=exact',
  '?variant=light&pass=exact',
  '?scenario=micro-calibration&variant=light&pass=exact',
  '?scenario=micro-calibration&variant=light&pass=exact&strict=root',
];

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

  it('installs the hook exactly when the entry module selects the measured realm', () => {
    for (const search of realmCases) {
      expect([search, runInlineHook(search) !== undefined])
        .toEqual([search, isMeasuredRealm(search)]);
    }
  });
});

describe('realm selection', () => {
  it('requires a non-empty scenario, variant, and pass', () => {
    expect(isMeasuredRealm('?scenario=micro-calibration&variant=light&pass=exact')).toBe(true);
    expect(isMeasuredRealm('?scenario=micro-calibration&variant=light')).toBe(false);
    expect(isMeasuredRealm('?scenario=&variant=light&pass=exact')).toBe(false);
    expect(isMeasuredRealm('')).toBe(false);
  });
});
