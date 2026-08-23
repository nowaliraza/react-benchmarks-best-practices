import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../src/viewer/App.jsx';
import data from '../src/viewer/generated-results.json';

globalThis.location = { hash: '' };

describe('evidence console', () => {
  it('renders the published result viewer from generated evidence', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Walk the observable boundaries');
    expect(html).toContain('render-commit-dom-boundary');
    expect(data.scenarios).toHaveLength(34);
    expect(data.releases.reduce((sum, release) => sum + release.observationCount, 0)).toBe(1962);
    expect(data.releases.every(({ gateIssueCount }) => gateIssueCount === 0)).toBe(true);
  });

  it('renders the guided curriculum with the first field note', () => {
    const html = renderToString(<App initialView="curriculum" />);
    expect(html).toContain('Learn to read React evidence');
    expect(html).toMatch(/Field note .*1.*\/.*5/);
    expect(html).toContain('Mark field note complete');
  });
});
