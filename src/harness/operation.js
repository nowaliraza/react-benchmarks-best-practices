export class OperationTimeoutError extends Error {
  constructor(label, timeoutMs) {
    super(`Operation ${label} exceeded ${timeoutMs} ms`);
    this.name = 'OperationTimeoutError';
    this.code = 'operation-timeout';
  }
}

export async function runOperation({ label, timeoutMs, execute, cleanup }) {
  const started = performance.now();
  let timer;
  try {
    const value = await Promise.race([
      execute(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new OperationTimeoutError(label, timeoutMs)), timeoutMs);
      }),
    ]);
    return { value, durationMs: performance.now() - started };
  } finally {
    clearTimeout(timer);
    await cleanup?.();
  }
}
