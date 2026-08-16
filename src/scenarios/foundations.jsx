import { memo, useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

const stableMemoData = Object.freeze({ value: 'fixed' });
const twoFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

function recordSetter(recorder, name, setter, value) {
  recorder.record('setter-call', { setter: name });
  setter(value);
}

export function RenderCommitDomBoundary({ variant, recorder, apiRef }) {
  recorder.invocation('Boundary');
  const [value, setValue] = useState(0);
  const [, setTick] = useState(0);
  apiRef.current.action = () => {
    if (variant === 'constant-markup') {
      recordSetter(recorder, 'tick', (next) => setTick(next), (current) => current + 1);
      return;
    }
    flushSync(() => recordSetter(recorder, 'value', setValue, 1));
    flushSync(() => recordSetter(recorder, 'value', setValue, 0));
  };
  apiRef.current.state = () => ({ value });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(value) });
  return <output id="state">{value}</output>;
}

function ScopeSibling({ recorder }) {
  recorder.invocation('Sibling');
  return <output id="sibling">stable</output>;
}

function ScopeLeaf({ recorder, liftedCount, liftedSetter, apiRef }) {
  recorder.invocation('Leaf');
  const [localCount, setLocalCount] = useState(0);
  const lifted = liftedCount !== undefined;
  const count = lifted ? liftedCount : localCount;
  const setter = lifted ? liftedSetter : setLocalCount;
  apiRef.current.action = () => recordSetter(recorder, lifted ? 'lifted' : 'local', setter, (value) => value + 1);
  apiRef.current.state = () => ({ count });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(count) });
  return <output id="state">{count}</output>;
}

export function LocalVersusLiftedState({ variant, recorder, apiRef }) {
  recorder.invocation('Parent');
  const [count, setCount] = useState(0);
  return (
    <section>
      <ScopeLeaf
        recorder={recorder}
        apiRef={apiRef}
        liftedCount={variant === 'lifted' ? count : undefined}
        liftedSetter={variant === 'lifted' ? setCount : undefined}
      />
      <ScopeSibling recorder={recorder} />
    </section>
  );
}

const MemoChild = memo(function MemoChild({ data, recorder }) {
  recorder.invocation('MemoChild');
  return <output id="memo-value">{data.value}</output>;
});

export function MemoPropIdentity({ variant, recorder, apiRef }) {
  recorder.invocation('MemoParent');
  const [tick, setTick] = useState(0);
  const data = variant === 'stable-object' ? stableMemoData : { value: 'fixed' };
  apiRef.current.action = () => recordSetter(recorder, 'tick', setTick, (value) => value + 1);
  apiRef.current.state = () => ({ tick, childValue: data.value });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#memo-value')?.textContent === data.value });
  return <section><output id="state">{tick}</output><MemoChild data={data} recorder={recorder} /></section>;
}

const StructuralBranch = memo(function StructuralBranch({ branch, name, recorder }) {
  recorder.invocation(name);
  return <output id={name === 'ChangedBranch' ? 'changed' : 'stable'}>{branch.value}</output>;
});

export function StructuralSharing({ variant, recorder, apiRef }) {
  recorder.invocation('StructuralParent');
  const [tree, setTree] = useState(() => ({ changed: { value: 0 }, stable: { value: 0 } }));
  apiRef.current.action = () => recordSetter(recorder, 'tree', setTree, (current) => ({
    changed: { value: current.changed.value + 1 },
    stable: variant === 'shared-branch' ? current.stable : { value: current.stable.value },
  }));
  apiRef.current.state = () => ({ changed: tree.changed.value, stable: tree.stable.value });
  apiRef.current.consistency = () => ({
    displayedEqualsState: document.querySelector('#changed')?.textContent === String(tree.changed.value)
      && document.querySelector('#stable')?.textContent === String(tree.stable.value),
  });
  return (
    <section>
      <StructuralBranch name="ChangedBranch" branch={tree.changed} recorder={recorder} />
      <StructuralBranch name="StableBranch" branch={tree.stable} recorder={recorder} />
    </section>
  );
}

export function ExecutionContextBatching({ variant, recorder, apiRef }) {
  recorder.invocation('Batching');
  const [count, setCount] = useState(0);
  const buttonRef = useRef(null);
  const increment = useCallback(() => recordSetter(recorder, 'count', setCount, (value) => value + 1), [recorder]);
  const handleClick = () => {
    if (variant === 'synchronous') {
      increment();
      increment();
      return;
    }
    if (variant === 'single-microtask') {
      queueMicrotask(() => {
        increment();
        increment();
      });
      return;
    }
    increment();
    setTimeout(increment, 0);
  };
  apiRef.current.action = async () => {
    buttonRef.current.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
  };
  apiRef.current.state = () => ({ count });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(count) });
  return <section><button ref={buttonRef} onClick={handleClick}>run</button><output id="state">{count}</output></section>;
}

export function StateUpdateQueue({ variant, recorder, apiRef }) {
  recorder.invocation('Queue');
  const [count, setCount] = useState(0);
  apiRef.current.action = () => {
    if (variant === 'direct-values') {
      recordSetter(recorder, 'count', setCount, count + 1);
      recordSetter(recorder, 'count', setCount, count + 1);
      recordSetter(recorder, 'count', setCount, count + 1);
      return;
    }
    recordSetter(recorder, 'count', setCount, (value) => value + 1);
    recordSetter(recorder, 'count', setCount, (value) => value + 1);
    recordSetter(recorder, 'count', setCount, (value) => value + 1);
  };
  apiRef.current.state = () => ({ count });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(count) });
  return <output id="state">{count}</output>;
}

export function SameValueUpdates({ variant, recorder, apiRef }) {
  recorder.invocation('SameValue');
  const [count, setCount] = useState(0);
  const set = (value) => recordSetter(recorder, 'count', setCount, value);
  apiRef.current.action = async () => {
    if (variant === 'fresh-direct-same') {
      set(0);
      set(0);
    } else if (variant === 'fresh-updater-same') {
      set((value) => value);
      set((value) => value);
    } else if (variant === 'real-same-same') {
      set(1);
      set(1);
      set(1);
      set(1);
    } else if (variant === 'real-same-idle-same') {
      set(1);
      await twoFrames();
      set(1);
      await twoFrames();
    } else {
      set(1);
      set(1);
      await twoFrames();
      set(2);
      set(2);
      await twoFrames();
    }
  };
  apiRef.current.state = () => ({ count });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(count) });
  return <output id="state">{count}</output>;
}

export function FlushSyncBoundary({ variant, recorder, apiRef }) {
  recorder.invocation('FlushBoundary');
  const [count, setCount] = useState(0);
  const set = (value) => recordSetter(recorder, 'count', setCount, value);
  apiRef.current.action = () => {
    if (variant === 'automatic') {
      set((value) => value + 1);
      set((value) => value + 1);
      return;
    }
    flushSync(() => set((value) => value + 1));
    set((value) => value + 1);
  };
  apiRef.current.state = () => ({ count });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(count) });
  return <output id="state">{count}</output>;
}
