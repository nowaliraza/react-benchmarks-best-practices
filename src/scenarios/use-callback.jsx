import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useMeasuredStateIdentity } from './instrumentation.js';

const stableIncrement = (setter) => setter((value) => value + 1);

const Child = memo(function Child({ onIncrement, recorder }) {
  recorder.invocation('Child');
  useEffect(() => {
    recorder.record('effect-setup');
    return () => recorder.record('effect-cleanup');
  }, [recorder]);
  return <button id="increment" onClick={onIncrement}>count action</button>;
});

export function UseCallbackScenario({ variant, recorder, apiRef }) {
  recorder.invocation('Parent');
  const [count, rawSetCount] = useState(0);
  const [unrelated, rawSetUnrelated] = useState(0);
  const outputRef = useRef(null);

  const setCount = useCallback((value) => {
    recorder.record('setter-call', { setter: 'count' });
    rawSetCount(value);
  }, [recorder]);
  const setUnrelated = useCallback((value) => {
    recorder.record('setter-call', { setter: 'unrelated' });
    rawSetUnrelated(value);
  }, [recorder]);

  const inline = () => setCount(count + 1);
  const withDeps = useCallback(() => setCount(count + 1), [count, setCount]);
  const functional = useCallback(() => setCount((value) => value + 1), [setCount]);
  const moduleStable = useCallback(() => stableIncrement(setCount), [setCount]);
  const callback = {
    inline,
    'callback-with-deps': withDeps,
    'callback-functional': functional,
    'module-stable': moduleStable,
  }[variant];

  useMeasuredStateIdentity(outputRef, apiRef);
  apiRef.current.action = async () => setUnrelated((value) => value + 1);
  apiRef.current.state = () => ({ count, unrelated });
  apiRef.current.consistency = () => ({ displayedEqualsState: outputRef.current?.textContent === `${count}:${unrelated}` });

  return (
    <section data-scenario="use-callback">
      <output ref={outputRef} id="state">{count}:{unrelated}</output>
      <Child onIncrement={callback} recorder={recorder} />
    </section>
  );
}
