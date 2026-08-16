import {
  memo,
  startTransition,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { flushSync } from 'react-dom';
import { scheduleExternalMutation } from './external-mutation.js';

export const CONCURRENCY_WORKLOAD = Object.freeze({
  renderItems: 240,
  renderItemMs: 0.55,
  commitBlockMs: 120,
  storeItems: 160,
  storeItemMs: 0.55,
});

function burnFor(milliseconds) {
  const deadline = performance.now() + milliseconds;
  let value = 0;
  while (performance.now() < deadline) value = (value + 1) >>> 0;
  return value;
}

function recordSetter(recorder, setter, value, name) {
  recorder.record('setter-call', { setter: name });
  setter(value);
}

function waitFor(predicate, timeoutMs = 3_000) {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (performance.now() - started > timeoutMs) {
        reject(new Error(`Concurrency fixture did not settle within ${timeoutMs} ms.`));
        return;
      }
      setTimeout(poll, 4);
    };
    poll();
  });
}

const SlowRenderItem = memo(function SlowRenderItem({ version, recorder, tracker }) {
  recorder.invocation('SlowRenderItem');
  if (version > 0) {
    tracker.total += 1;
    if (!tracker.firstMarked) {
      tracker.firstMarked = true;
      recorder.record('first render chunk');
    }
    burnFor(CONCURRENCY_WORKLOAD.renderItemMs);
  }
  return null;
});

function SlowRenderSet({ version, recorder, tracker }) {
  return Array.from({ length: CONCURRENCY_WORKLOAD.renderItems }, (_, index) => (
    <SlowRenderItem key={index} version={version} recorder={recorder} tracker={tracker} />
  ));
}

export function RenderHeavyCheapCommit({ variant, recorder, apiRef }) {
  recorder.invocation('RenderHeavyRoot');
  const [version, setVersion] = useState(0);
  const tracker = useRef({ total: 0, firstMarked: false }).current;
  useLayoutEffect(() => {
    if (version > 0) recorder.record('commit');
  }, [recorder, version]);
  apiRef.current.action = async () => {
    tracker.total = 0;
    tracker.firstMarked = false;
    const update = () => recordSetter(recorder, setVersion, 1, 'version');
    if (variant === 'transition') startTransition(update);
    else update();
    await waitFor(() => document.querySelector('#state')?.textContent === '1');
  };
  apiRef.current.state = () => ({ version });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(version) });
  apiRef.current.discardedWorkLowerBound = () => Math.max(0, tracker.total - CONCURRENCY_WORKLOAD.renderItems);
  return <section><output id="state">{version}</output><SlowRenderSet version={version} recorder={recorder} tracker={tracker} /></section>;
}

export function CheapRenderHeavyCommit({ variant, recorder, apiRef }) {
  recorder.invocation('CommitHeavyRoot');
  const [version, setVersion] = useState(0);
  useLayoutEffect(() => {
    if (version === 0) return;
    recorder.record('commit work start');
    burnFor(CONCURRENCY_WORKLOAD.commitBlockMs);
    recorder.record('commit work end');
  }, [recorder, version]);
  apiRef.current.action = async () => {
    const update = () => recordSetter(recorder, setVersion, 1, 'version');
    if (variant === 'transition') startTransition(update);
    else update();
    await waitFor(() => document.querySelector('#state')?.textContent === '1');
  };
  apiRef.current.state = () => ({ version });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(version) });
  return <output id="state">{version}</output>;
}

function InterruptibleWork({ variant, recorder, apiRef }) {
  recorder.invocation('InterruptibleRoot');
  const [version, setVersion] = useState(0);
  const [urgent, setUrgent] = useState(0);
  const tracker = useRef({ total: 0, firstMarked: false }).current;
  const committed = useRef({ version: 0, urgent: 0 });
  useLayoutEffect(() => {
    if (urgent > committed.current.urgent) recorder.record('urgent commit');
    if (version > committed.current.version) recorder.record('transition commit');
    committed.current = { version, urgent };
  }, [recorder, urgent, version]);
  apiRef.current.action = async () => {
    tracker.total = 0;
    tracker.firstMarked = false;
    recorder.record('transition scheduled');
    startTransition(() => recordSetter(recorder, setVersion, 1, 'transition-version'));
    if (variant === 'interrupted' || variant === 'urgent-interrupt') {
      setTimeout(() => {
        recorder.record('urgent setter');
        flushSync(() => setUrgent(1));
      }, 12);
    }
    const expectedUrgent = variant === 'interrupted' || variant === 'urgent-interrupt' ? '1' : '0';
    await waitFor(() => document.querySelector('#state')?.textContent === `1:${expectedUrgent}`);
  };
  apiRef.current.state = () => ({ version, urgent });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === `${version}:${urgent}` });
  apiRef.current.discardedWorkLowerBound = () => Math.max(0, tracker.total - CONCURRENCY_WORKLOAD.renderItems);
  return (
    <section>
      <output id="state">{version}:{urgent}</output>
      <SlowRenderSet version={version} recorder={recorder} tracker={tracker} />
    </section>
  );
}

export function UrgentTransitionInterruption(props) {
  return <InterruptibleWork {...props} />;
}

export function DiscardedRenderWork(props) {
  return <InterruptibleWork {...props} />;
}

function createStore() {
  let value = 0;
  const listeners = new Set();
  return {
    getSnapshot: () => value,
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    reset() { value = 0; },
    mutate(nextValue) { value = nextValue; },
    emit() { listeners.forEach((listener) => listener()); },
  };
}

const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;

function StoreReadItem({ epoch, snapshot, store, index, recorder, tracker }) {
  recorder.invocation('StoreReadItem');
  if (epoch > 0) {
    tracker.total += 1;
    if (!tracker.firstMarked) {
      tracker.firstMarked = true;
      recorder.record('first render chunk');
    }
  }
  const value = snapshot === undefined ? store.getSnapshot() : snapshot;
  if (epoch > 0) burnFor(CONCURRENCY_WORKLOAD.storeItemMs);
  if (epoch > 0 && index === CONCURRENCY_WORKLOAD.storeItems - 1 && !tracker.lastMarked) {
    tracker.lastMarked = true;
    recorder.record('last render chunk of the first pass');
  }
  return <span data-store-value={value}>{value}</span>;
}

function ExternalStoreWork({ safe, recorder, apiRef }) {
  recorder.invocation(safe ? 'SyncStoreRoot' : 'DirectStoreRoot');
  const store = useRef(null);
  if (store.current === null) store.current = createStore();
  const synchronizedSnapshot = useSyncExternalStore(
    safe ? store.current.subscribe : noopSubscribe,
    safe ? store.current.getSnapshot : zeroSnapshot,
  );
  const snapshot = safe ? synchronizedSnapshot : undefined;
  const [epoch, setEpoch] = useState(0);
  const tracker = useRef({
    total: 0,
    firstMarked: false,
    lastMarked: false,
    active: false,
    commitConsistency: [],
  }).current;
  useLayoutEffect(() => {
    if (tracker.active) {
      const values = [...document.querySelectorAll('[data-store-value]')].map((node) => Number(node.textContent));
      tracker.commitConsistency.push(values.length === CONCURRENCY_WORKLOAD.storeItems && values.every((value) => value === values[0]));
    }
    if (epoch > 0) recorder.record('commit');
  }, [epoch, recorder, synchronizedSnapshot, tracker]);
  apiRef.current.action = async () => {
    store.current.reset();
    tracker.total = 0;
    tracker.firstMarked = false;
    tracker.lastMarked = false;
    tracker.active = true;
    tracker.commitConsistency = [];
    startTransition(() => recordSetter(recorder, setEpoch, 1, 'epoch'));
    scheduleExternalMutation({
      ready: () => tracker.firstMarked,
      mark: (event) => recorder.record(event),
      mutate: () => {
        store.current.mutate(1);
        store.current.emit();
      },
    });
    await waitFor(() => document.querySelector('#state')?.textContent === 'done');
    tracker.active = false;
  };
  apiRef.current.state = () => ({ epoch, storeVersion: store.current.getSnapshot() });
  apiRef.current.consistency = () => {
    const values = [...document.querySelectorAll('[data-store-value]')].map((node) => Number(node.textContent));
    return {
      leftEqualsRight: values.length === CONCURRENCY_WORKLOAD.storeItems && values.every((value) => value === values[0]),
      left: values[0] ?? null,
      right: values.at(-1) ?? null,
      storeVersion: store.current.getSnapshot(),
      allCommitsConsistent: tracker.commitConsistency.length > 0 && tracker.commitConsistency.every(Boolean),
    };
  };
  apiRef.current.discardedWorkLowerBound = () => Math.max(0, tracker.total - CONCURRENCY_WORKLOAD.storeItems);
  return (
    <section>
      <output id="state">{epoch > 0 ? 'done' : 'ready'}</output>
      {Array.from({ length: CONCURRENCY_WORKLOAD.storeItems }, (_, index) => (
        <StoreReadItem
          key={index}
          epoch={epoch}
          snapshot={snapshot}
          store={store.current}
          index={index}
          recorder={recorder}
          tracker={tracker}
        />
      ))}
    </section>
  );
}

export function ExternalStoreTearing(props) {
  return <ExternalStoreWork {...props} safe={false} />;
}

export function SyncExternalStoreConsistency(props) {
  return <ExternalStoreWork {...props} safe />;
}
