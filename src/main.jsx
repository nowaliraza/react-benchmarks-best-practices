import { createRoot } from 'react-dom/client';
import { createBrowserRunner } from './harness/browser-runner.jsx';

const params = new URLSearchParams(location.search);
const scenarioId = params.get('scenario');
const variantId = params.get('variant');
const pass = params.get('pass');
const rootElement = document.querySelector('#measured-root');
const runtimeErrors = [];
const onError = (event) => runtimeErrors.push(event.error?.stack ?? event.message ?? 'Unknown window error');
const onUnhandledRejection = (event) => runtimeErrors.push(event.reason?.stack ?? String(event.reason));
window.addEventListener('error', onError);
window.addEventListener('unhandledrejection', onUnhandledRejection);

const ready = new Promise((resolve) => { window.__LAB_READY_RESOLVE__ = resolve; });
const runner = createBrowserRunner({ scenarioId, variantId, pass, root: rootElement });
const root = createRoot(rootElement);
root.render(runner.element);

window.__LAB__ = {
  ready,
  instruments: runner.instruments,
  async run() {
    await ready;
    const result = await runner.run();
    if (runtimeErrors.length > 0) throw new Error(`Measured realm runtime error:\n${runtimeErrors.join('\n')}`);
    return result;
  },
  cleanup() {
    root.unmount();
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    delete window.__LAB__;
  },
};
