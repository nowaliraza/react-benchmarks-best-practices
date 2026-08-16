import { useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export const OBSERVER_WORKLOAD = Object.freeze({ items: 500, responsivenessWorkMs: 10 });

function burnFor(milliseconds) {
  const deadline = performance.now() + milliseconds;
  while (performance.now() < deadline) { /* deliberate observer calibration work */ }
}

export function BuildModeSemantics({ recorder, apiRef }) {
  recorder.invocation('BuildModeSubject');
  useLayoutEffect(() => {
    recorder.record('effect-setup');
    return () => recorder.record('effect-cleanup');
  }, [recorder]);
  apiRef.current.includeMountEvidence = true;
  apiRef.current.action = () => {};
  apiRef.current.state = () => ({ ready: true });
  apiRef.current.consistency = () => ({ final: document.querySelector('#state')?.textContent === 'ready' });
  return <output id="state">ready</output>;
}

function NullLeaf({ recorder, name }) {
  recorder.invocation(name);
  return null;
}

function ProfiledWork({ recorder, apiRef }) {
  recorder.invocation('ProfiledWork');
  const [tick, setTick] = useState(0);
  apiRef.current.action = () => flushSync(() => setTick((current) => current + 1));
  apiRef.current.state = () => ({ tick });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(tick) });
  return (
    <section>
      <output id="state">{tick}</output>
      {Array.from({ length: OBSERVER_WORKLOAD.items }, (_, index) => <NullLeaf key={index} name="ProfiledLeaf" recorder={recorder} />)}
    </section>
  );
}

export function ProfilingBuildProfiler(props) {
  return <ProfiledWork {...props} />;
}

export function ReactProfilerOverhead(props) {
  return <ProfiledWork {...props} />;
}

export function WorkLogOverhead({ recorder, apiRef }) {
  recorder.invocation('WorkLogRoot');
  const [tick, setTick] = useState(0);
  apiRef.current.action = () => flushSync(() => setTick((current) => current + 1));
  apiRef.current.state = () => ({ tick });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(tick) });
  return (
    <section>
      <output id="state">{tick}</output>
      {Array.from({ length: OBSERVER_WORKLOAD.items }, (_, index) => <NullLeaf key={index} name="WorkLogLeaf" recorder={recorder} />)}
    </section>
  );
}

export function MutationObserverOverhead({ recorder, apiRef }) {
  recorder.invocation('MutationObserverRoot');
  const [tick, setTick] = useState(0);
  apiRef.current.action = () => flushSync(() => setTick((current) => current + 1));
  apiRef.current.state = () => ({ tick });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(tick) });
  return (
    <section>
      <output id="state">{tick}</output>
      {Array.from({ length: OBSERVER_WORKLOAD.items }, (_, index) => <span key={index}>{tick}</span>)}
    </section>
  );
}

export function ResponsivenessInstrumentOverhead({ recorder, apiRef }) {
  recorder.invocation('ResponsivenessObserverRoot');
  const [done, setDone] = useState(false);
  apiRef.current.action = () => {
    burnFor(OBSERVER_WORKLOAD.responsivenessWorkMs);
    setDone(true);
  };
  apiRef.current.state = () => ({ done });
  apiRef.current.consistency = () => ({ final: done });
  return <output id="state">{done ? 'done' : 'ready'}</output>;
}
