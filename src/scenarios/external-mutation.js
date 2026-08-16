// Host-scheduled fixture for concurrency scenarios. The mutation callback is
// never invoked from a component body.
export function scheduleExternalMutation({ mutate, mark, ready = () => true }) {
  const poll = () => {
    if (!ready()) {
      setTimeout(poll, 0);
      return;
    }
    mark('external mutation');
    mutate();
  };
  return setTimeout(poll, 0);
}
