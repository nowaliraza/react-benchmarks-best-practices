import { useCallback, useLayoutEffect, useRef } from 'react';

export function createRecorder(enabled) {
  const events = [];
  const invocations = new Map();
  const record = (event, detail = {}) => {
    if (enabled) events.push({ event, at: performance.now(), ...detail });
  };
  return {
    events,
    invocation(name) {
      if (!enabled) return;
      invocations.set(name, (invocations.get(name) ?? 0) + 1);
      record('component-invocation', { component: name });
    },
    record,
    counts() { return Object.fromEntries(invocations); },
    reset() {
      events.length = 0;
      invocations.clear();
    },
  };
}

export function useMeasuredStateIdentity(nodeRef, apiRef) {
  const initialNode = useRef(null);
  useLayoutEffect(() => {
    if (!initialNode.current) initialNode.current = nodeRef.current;
    apiRef.current.domIdentityPreserved = initialNode.current === nodeRef.current;
  });
}

export function useCallbackRef(recorder) {
  return useCallback((node) => {
    recorder.record(node ? 'ref-attach' : 'ref-detach');
  }, [recorder]);
}
