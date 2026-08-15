import { UseCallbackScenario } from './use-callback.jsx';
import {
  ConsistencyFixture,
  MicroCalibration,
  PresentedFrameCalibration,
  ResponsivenessCalibration,
} from './calibrations.jsx';

export const scenarios = {
  'use-callback-semantics': UseCallbackScenario,
  'micro-calibration': MicroCalibration,
  'responsiveness-calibration': ResponsivenessCalibration,
  'presented-frame-calibration': PresentedFrameCalibration,
  'intra-consistency-fixture': ConsistencyFixture,
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
