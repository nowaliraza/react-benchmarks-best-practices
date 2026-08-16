export default Object.freeze({
  protocolVersion: '0.1.0',
  expectedVersions: {
    react: '19.2.8',
    reactDom: '19.2.8',
    scheduler: '0.27.0',
    node: 'v22.12.0',
    chrome: '145.0.7632.159',
  },
  ports: { preview: 4173 },
  viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  timeoutMs: 5_000,
  budgets: {
    fast: { exactIterations: 2, behaviorIterations: 1, microIterations: 1, microRotations: 1, responsiveIterations: 1, responsiveRotations: 1, processes: 1 },
    verification: { exactIterations: 1, behaviorIterations: 1, microIterations: 1, microRotations: 1, responsiveIterations: 1, responsiveRotations: 1, processes: 1 },
    publication: { exactIterations: 5, behaviorIterations: 1, microIterations: 8, microRotations: 5, responsiveIterations: 3, responsiveRotations: 3, processes: 2 },
  },
});
