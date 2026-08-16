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
import {
  CheapRenderHeavyCommit,
  DiscardedRenderWork,
  ExternalStoreTearing,
  RenderHeavyCheapCommit,
  SyncExternalStoreConsistency,
  UrgentTransitionInterruption,
} from './concurrency.jsx';
import {
  DerivedStateBoundary,
  EffectSetupCleanupOrder,
  IdentityEffectChurn,
  IdentityRefChurn,
  LayoutEffectStateUpdate,
  PassiveEffectStateUpdate,
  RefCommitTiming,
  UseMemoCrossover,
} from './effects.jsx';
import {
  BuildModeSemantics,
  MutationObserverOverhead,
  ProfilingBuildProfiler,
  ReactProfilerOverhead,
  ResponsivenessInstrumentOverhead,
  WorkLogOverhead,
} from './builds.jsx';

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
  'render-heavy-cheap-commit': RenderHeavyCheapCommit,
  'cheap-render-heavy-commit': CheapRenderHeavyCommit,
  'urgent-transition-interruption': UrgentTransitionInterruption,
  'discarded-render-work': DiscardedRenderWork,
  'external-store-tearing': ExternalStoreTearing,
  'sync-external-store-consistency': SyncExternalStoreConsistency,
  'use-memo-crossover': UseMemoCrossover,
  'derived-state-boundary': DerivedStateBoundary,
  'layout-effect-state-update': LayoutEffectStateUpdate,
  'passive-effect-state-update': PassiveEffectStateUpdate,
  'effect-setup-cleanup-order': EffectSetupCleanupOrder,
  'ref-commit-timing': RefCommitTiming,
  'identity-effect-churn': IdentityEffectChurn,
  'identity-ref-churn': IdentityRefChurn,
  'build-mode-semantics': BuildModeSemantics,
  'profiling-build-profiler': ProfilingBuildProfiler,
  'react-profiler-overhead': ReactProfilerOverhead,
  'work-log-overhead': WorkLogOverhead,
  'mutation-observer-overhead': MutationObserverOverhead,
  'responsiveness-instrument-overhead': ResponsivenessInstrumentOverhead,
};

export { scheduleExternalMutation } from './external-mutation.js';
