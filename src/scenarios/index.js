import { UseCallbackScenario } from './use-callback.jsx';
import {
  ConsistencyFixture,
  MicroCalibration,
  PresentedFrameCalibration,
  ResponsivenessCalibration,
} from './calibrations.jsx';
import {
  ExecutionContextBatching,
  FlushSyncBoundary,
  LocalVersusLiftedState,
  MemoPropIdentity,
  RenderCommitDomBoundary,
  SameValueUpdates,
  StateUpdateQueue,
  StructuralSharing,
} from './foundations.jsx';

export const scenarios = {
  'use-callback-semantics': UseCallbackScenario,
  'micro-calibration': MicroCalibration,
  'responsiveness-calibration': ResponsivenessCalibration,
  'presented-frame-calibration': PresentedFrameCalibration,
  'intra-consistency-fixture': ConsistencyFixture,
  'render-commit-dom-boundary': RenderCommitDomBoundary,
  'local-versus-lifted-state': LocalVersusLiftedState,
  'memo-prop-identity': MemoPropIdentity,
  'structural-sharing': StructuralSharing,
  'execution-context-batching': ExecutionContextBatching,
  'state-update-queue': StateUpdateQueue,
  'same-value-updates': SameValueUpdates,
  'flush-sync-boundary': FlushSyncBoundary,
};

// Fixture for concurrency scenarios: mutation is scheduled by the host task,
// never called from a component body. The ordered marks let a scenario gate prove
// that it landed between React-supplied render chunk callbacks.
export function scheduleExternalMutation({ mutate, mark }) {
  return setTimeout(() => {
    mark('external mutation');
    mutate();
  }, 0);
}
