import { Profiler, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { captureBehavior } from './dom.js';
import { createRecorder } from '../scenarios/instrumentation.js';
import { scenarios } from '../scenarios/index.js';

const twoFrames = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

const oneTask = () => new Promise((resolve) => setTimeout(resolve, 0));

function mutationTarget(node, root) {
  if (!(node instanceof Element)) return node.parentElement?.id ? `#${node.parentElement.id}` : '#text';
  if (node.id) return `#${node.id}`;
  if (node === root) return '#measured-root';
  return node.tagName.toLowerCase();
}

export function createBrowserRunner({ scenarioId, variantId, pass, root }) {
  const workLogEnabled = pass === 'exact' || pass === 'behavior-log';
  const recorder = createRecorder(workLogEnabled);
  const apiRef = { current: {} };
  const profilerSamples = [];
  const Component = scenarios[scenarioId];
  if (!Component) throw new Error(`Unknown scenario: ${scenarioId}`);

  function MeasuredScenario() {
    const readyOnce = useRef(false);
    useLayoutEffect(() => {
      if (!readyOnce.current) {
        readyOnce.current = true;
        queueMicrotask(() => window.__LAB_READY_RESOLVE__?.());
      }
    }, []);
    return <Component variant={variantId} recorder={recorder} apiRef={apiRef} />;
  }

  const element = (
    <Profiler id={`${scenarioId}:${variantId}`} onRender={(_id, phase, actualDuration) => {
      profilerSamples.push({ phase, actualDuration, at: performance.now() });
    }}>
      <MeasuredScenario />
    </Profiler>
  );

  function reset() {
    recorder.reset();
    profilerSamples.length = 0;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__._commits.length = 0;
  }

  async function exact() {
    reset();
    const mutations = [];
    const observer = new MutationObserver((records) => {
      for (const mutation of records) {
        mutations.push({ type: mutation.type, target: mutationTarget(mutation.target, root) });
      }
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    await apiRef.current.action();
    await oneTask();
    await twoFrames();
    observer.disconnect();
    const events = recorder.events;
    return {
      exact: {
        componentInvocations: recorder.counts(),
        commits: window.__REACT_DEVTOOLS_GLOBAL_HOOK__._commits.length,
        setterCalls: events.filter(({ event }) => event === 'setter-call').length,
        mutations,
        effectSetups: events.filter(({ event }) => event === 'effect-setup').length,
        effectCleanups: events.filter(({ event }) => event === 'effect-cleanup').length,
        refAttaches: events.filter(({ event }) => event === 'ref-attach').length,
        refDetaches: events.filter(({ event }) => event === 'ref-detach').length,
        lifecycle: events.map(({ event, at }) => ({ event, at })),
        discardedWorkLowerBound: 0,
      },
    };
  }

  async function behaviorLog() {
    reset();
    await apiRef.current.action();
    await oneTask();
    await twoFrames();
    await oneTask();
    await twoFrames();
    return {
      behavior: captureBehavior(
        root,
        apiRef.current,
        [],
        recorder.events
          .filter(({ event }) => event.startsWith('effect-') || event.startsWith('ref-'))
          .map(({ event, at }) => ({ event, at })),
      ),
    };
  }

  async function behaviorFrame() {
    reset();
    const frames = [];
    let frameCount = 0;
    let stopped = false;
    const sample = () => {
      const state = root.querySelector('#state')?.textContent ?? root.textContent;
      frames.push({ at: performance.now(), state });
      frameCount += 1;
      if (!stopped && frameCount < 8 && state !== 'final') requestAnimationFrame(sample);
    };
    await apiRef.current.action();
    requestAnimationFrame(sample);
    await new Promise((resolve) => setTimeout(resolve, 140));
    stopped = true;
    if (frames.at(-1)?.state !== 'final') {
      frames.push({ at: performance.now(), state: root.querySelector('#state')?.textContent ?? root.textContent });
    }
    return { behavior: captureBehavior(root, apiRef.current, frames) };
  }

  async function microTiming() {
    reset();
    const started = performance.now();
    await apiRef.current.action();
    const scriptEnded = performance.now();
    await twoFrames();
    const ended = performance.now();
    return {
      micro: {
        micro_script_ms: scriptEnded - started,
        micro_layout_ms: null,
        micro_total_ms: scriptEnded - started,
        micro_e2e_ms: ended - started,
        profiler_actual_ms: profilerSamples.length === 0
          ? null
          : profilerSamples.reduce((sum, sample) => sum + sample.actualDuration, 0),
        profiler_callback_count: profilerSamples.length,
      },
    };
  }

  async function responsiveness() {
    reset();
    const started = performance.now();
    const ticks = [started];
    const longTasks = [];
    const longTaskOffsets = [];
    const observer = PerformanceObserver.supportedEntryTypes.includes('longtask')
      ? new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTasks.push(entry.duration);
            longTaskOffsets.push(Math.max(0, entry.startTime - started));
          }
        })
      : null;
    observer?.observe({ type: 'longtask', buffered: true });
    const timer = setInterval(() => ticks.push(performance.now()), 1);
    await oneTask();
    await apiRef.current.action();
    await new Promise((resolve) => setTimeout(resolve, 120));
    clearInterval(timer);
    observer?.disconnect();
    const ended = performance.now();
    ticks.push(ended);
    const gaps = ticks.slice(1).map((tick, index) => tick - ticks[index]);
    return {
      responsiveness: {
        responsive_elapsed_ms: ended - started,
        responsive_max_gap_ms: Math.max(0, ...gaps),
        responsive_ticks: ticks.length,
        responsive_gaps_over_16: gaps.filter((gap) => gap > 16).length,
        responsive_long_tasks: longTasks,
        responsive_long_task_offsets: longTaskOffsets,
      },
    };
  }

  const runners = {
    exact,
    'behavior-log': behaviorLog,
    'behavior-frame': behaviorFrame,
    'micro-timing': microTiming,
    responsiveness,
  };

  return {
    element,
    async run() {
      if (!runners[pass]) throw new Error(`Unsupported pass: ${pass}`);
      return runners[pass]();
    },
    instruments: {
      exact: ['component-bodies', 'setter-wrappers', 'effects', 'refs', 'MutationObserver', 'Profiler', 'commit-hook'],
      'behavior-log': ['component-bodies', 'effects', 'refs'],
      'behavior-frame': ['requestAnimationFrame'],
      'micro-timing': ['performance.now', 'Profiler', 'requestAnimationFrame'],
      responsiveness: ['1ms-tick-sampler', 'PerformanceObserver:longtask', 'performance.now'],
    }[pass],
  };
}

export { flushSync };
