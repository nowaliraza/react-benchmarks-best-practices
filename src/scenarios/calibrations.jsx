import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useMeasuredStateIdentity } from './instrumentation.js';

function deterministicWork(iterations) {
  let value = 0;
  for (let index = 0; index < iterations; index += 1) {
    value = (value + Math.imul(index, 31)) >>> 0;
  }
  return value;
}

export function MicroCalibration({ variant, recorder, apiRef }) {
  recorder.invocation('MicroCalibration');
  const [step, setStep] = useState(0);
  const outputRef = useRef(null);
  const checksum = deterministicWork(variant === 'heavy' ? 3_000_000 : 5_000) + step;
  useMeasuredStateIdentity(outputRef, apiRef);
  apiRef.current.action = () => flushSync(() => setStep((value) => value + 1));
  apiRef.current.state = () => ({ step });
  apiRef.current.consistency = () => ({ checksumFinite: Number.isFinite(checksum) });
  return <output ref={outputRef} id="state" data-checksum-kind="finite">step:{step}</output>;
}

export function ResponsivenessCalibration({ variant, recorder, apiRef }) {
  recorder.invocation('ResponsivenessCalibration');
  const [done, setDone] = useState(false);
  apiRef.current.action = () => {
    if (variant === 'blocked') {
      const until = performance.now() + 80;
      while (performance.now() < until) { /* intentional calibration block */ }
    }
    setDone(true);
  };
  apiRef.current.state = () => ({ done });
  apiRef.current.consistency = () => ({ done });
  return <output id="state">{done ? 'done' : 'ready'}</output>;
}

export function PresentedFrameCalibration({ variant, recorder, apiRef }) {
  recorder.invocation('PresentedFrameCalibration');
  const [state, setState] = useState('ready');
  apiRef.current.action = () => {
    if (variant === 'direct') {
      setState('final');
      return;
    }
    flushSync(() => setState('intermediate'));
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => setState('final'), 0)));
  };
  apiRef.current.state = () => ({ state });
  apiRef.current.consistency = () => ({ final: state === 'final' });
  return <output id="state">{state}</output>;
}

export function ConsistencyFixture({ variant, recorder, apiRef }) {
  recorder.invocation('ConsistencyFixture');
  const left = 1;
  const right = variant === 'planted-tear' ? 2 : 1;
  apiRef.current.action = () => {};
  apiRef.current.state = () => ({ left, right });
  apiRef.current.consistency = () => ({ leftEqualsRight: left === right, left, right });
  return <section><output id="left">{left}</output><output id="right">{right}</output></section>;
}
