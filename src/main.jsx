import { createRoot } from 'react-dom/client';
import { createBrowserRunner } from './harness/browser-runner.jsx';

const params = new URLSearchParams(location.search);
const scenarioId = params.get('scenario');
const variantId = params.get('variant');
const pass = params.get('pass');
const rootElement = document.querySelector('#measured-root');

const ready = new Promise((resolve) => { window.__LAB_READY_RESOLVE__ = resolve; });
const runner = createBrowserRunner({ scenarioId, variantId, pass, root: rootElement });
const root = createRoot(rootElement);
root.render(runner.element);

window.__LAB__ = {
  ready,
  instruments: runner.instruments,
  async run() {
    await ready;
    return runner.run();
  },
  cleanup() {
    root.unmount();
    delete window.__LAB__;
  },
};
