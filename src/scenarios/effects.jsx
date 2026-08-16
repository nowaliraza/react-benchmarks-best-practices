import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

export const EFFECTS_WORKLOAD = Object.freeze({
  memoNearIterations: 0,
  memoExpensiveIterations: 1_000_000,
});

const stableOptions = Object.freeze({ room: 'alpha' });

function calculate(iterations, recorder) {
  recorder.invocation('Calculation');
  let checksum = 0;
  for (let index = 0; index < iterations; index += 1) checksum = (checksum + Math.imul(index, 17)) >>> 0;
  return Number.isFinite(checksum) ? 42 : 0;
}

export function UseMemoCrossover({ variant, recorder, apiRef }) {
  recorder.invocation('MemoCrossover');
  const [tick, setTick] = useState(0);
  const expensive = variant.endsWith('expensive');
  const memoized = variant.startsWith('memo-');
  const iterations = expensive ? EFFECTS_WORKLOAD.memoExpensiveIterations : EFFECTS_WORKLOAD.memoNearIterations;
  const cached = useMemo(() => calculate(iterations, recorder), [iterations, recorder]);
  const value = memoized ? cached : calculate(iterations, recorder);
  apiRef.current.action = () => flushSync(() => setTick((current) => current + 1));
  apiRef.current.state = () => ({ tick, value });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === `${tick}:${value}` });
  return <output id="state">{tick}:{value}</output>;
}

export function DerivedStateBoundary({ variant, recorder, apiRef }) {
  recorder.invocation('DerivedState');
  const [first, setFirst] = useState('Ada');
  const last = 'Lovelace';
  const [effectFull, setEffectFull] = useState(`${first} ${last}`);
  useEffect(() => {
    if (variant !== 'effect-derived') return undefined;
    recorder.record('effect-setup');
    setEffectFull(`${first} ${last}`);
    return undefined;
  }, [first, last, recorder, variant]);
  const full = variant === 'render-derived' ? `${first} ${last}` : effectFull;
  apiRef.current.action = () => setFirst('Grace');
  apiRef.current.state = () => ({ first, full });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === `${first}|${full}` });
  return <output id="state">{first}|{full}</output>;
}

function EffectStateBoundary({ kind, variant, recorder, apiRef }) {
  recorder.invocation(kind === 'layout' ? 'LayoutBoundary' : 'PassiveBoundary');
  const [source, setSource] = useState(0);
  const [display, setDisplay] = useState(0);
  useLayoutEffect(() => {
    if (kind !== 'layout' || variant !== 'layout-effect') return undefined;
    recorder.record('effect-setup');
    setDisplay(source);
    return undefined;
  }, [source, variant, recorder, kind]);
  useEffect(() => {
    if (kind !== 'passive' || variant !== 'passive-effect') return undefined;
    recorder.record('effect-setup');
    setDisplay(source);
    return undefined;
  }, [source, variant, recorder, kind]);
  const visible = variant === 'render-direct' ? source : display;
  apiRef.current.action = () => setSource(1);
  apiRef.current.state = () => ({ source, display: visible });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === `${source}:${visible}` });
  return <output id="state">{source}:{visible}</output>;
}

export function LayoutEffectStateUpdate(props) {
  return <EffectStateBoundary {...props} kind="layout" />;
}

export function PassiveEffectStateUpdate(props) {
  return <EffectStateBoundary {...props} kind="passive" />;
}

export function EffectSetupCleanupOrder({ recorder, apiRef }) {
  recorder.invocation('EffectOrder');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    recorder.record('effect-setup');
    return () => recorder.record('effect-cleanup');
  }, [version, recorder]);
  apiRef.current.action = () => setVersion(1);
  apiRef.current.state = () => ({ version });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(version) });
  return <output id="state">{version}</output>;
}

function RefTimingChild({ recorder }) {
  const ref = useCallback((node) => recorder.record(node ? 'ref-attach' : 'ref-detach'), [recorder]);
  useLayoutEffect(() => {
    recorder.record('layout-effect-setup');
    return () => recorder.record('layout-effect-cleanup');
  }, [recorder]);
  return <output ref={ref} id="state">mounted</output>;
}

export function RefCommitTiming({ recorder, apiRef }) {
  recorder.invocation('RefTimingRoot');
  const [shown, setShown] = useState(false);
  apiRef.current.action = () => flushSync(() => setShown(true));
  apiRef.current.state = () => ({ shown });
  apiRef.current.consistency = () => ({ final: shown && document.querySelector('#state')?.textContent === 'mounted' });
  return shown ? <RefTimingChild recorder={recorder} /> : <output id="placeholder">empty</output>;
}

function EffectChurnChild({ options, recorder }) {
  recorder.invocation('EffectChurnChild');
  useEffect(() => {
    recorder.record('effect-setup');
    return () => recorder.record('effect-cleanup');
  }, [options, recorder]);
  return <output id="value">{options.room}</output>;
}

export function IdentityEffectChurn({ variant, recorder, apiRef }) {
  recorder.invocation('EffectChurnRoot');
  const [tick, setTick] = useState(0);
  const options = variant === 'stable-dependency' ? stableOptions : { room: 'alpha' };
  apiRef.current.action = () => setTick((current) => current + 1);
  apiRef.current.state = () => ({ tick, room: options.room });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(tick) });
  return <section><output id="state">{tick}</output><EffectChurnChild options={options} recorder={recorder} /></section>;
}

function RefChurnChild({ callbackRef, recorder }) {
  recorder.invocation('RefChurnChild');
  return <output ref={callbackRef} id="value">stable</output>;
}

export function IdentityRefChurn({ variant, recorder, apiRef }) {
  recorder.invocation('RefChurnRoot');
  const [tick, setTick] = useState(0);
  const stableRef = useCallback((node) => recorder.record(node ? 'ref-attach' : 'ref-detach'), [recorder]);
  const callbackRef = variant === 'stable-callback-ref'
    ? stableRef
    : (node) => recorder.record(node ? 'ref-attach' : 'ref-detach');
  apiRef.current.action = () => setTick((current) => current + 1);
  apiRef.current.state = () => ({ tick });
  apiRef.current.consistency = () => ({ displayedEqualsState: document.querySelector('#state')?.textContent === String(tick) });
  return <section><output id="state">{tick}</output><RefChurnChild callbackRef={callbackRef} recorder={recorder} /></section>;
}
