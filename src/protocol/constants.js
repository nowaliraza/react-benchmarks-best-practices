export const PROTOCOL_VERSION = '0.1.0';
export const REGISTRY_SCHEMA_VERSION = 1;
export const RESULT_SCHEMA_VERSION = 1;
export const BOOLEAN_ATTRIBUTES_VERSION = 1;

export const HTML_BOOLEAN_ATTRIBUTES = Object.freeze([
  'checked',
  'disabled',
  'hidden',
  'multiple',
  'readonly',
  'required',
  'selected',
]);

export const VERDICTS = Object.freeze([
  'unmeasured',
  'supported',
  'refuted',
  'inconclusive',
  'excluded',
  'retracted',
]);

export const PASS_FAMILIES = Object.freeze([
  'exact',
  'behavior-log',
  'behavior-frame',
  'micro-timing',
  'responsiveness',
]);

export const EVIDENCE_KINDS = Object.freeze([
  'observed',
  'derived',
  'conceptual',
  'unobservable-internal',
]);
