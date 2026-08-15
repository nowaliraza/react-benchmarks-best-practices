import { z } from 'zod';
import { PASS_FAMILIES, VERDICTS } from './constants.js';

const reasonSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});

export const relationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('equivalent'), variants: z.array(z.string()).min(2), metric: z.string() }),
  z.object({ kind: z.literal('different'), variants: z.array(z.string()).min(2), metric: z.string() }),
  z.object({ kind: z.literal('exact'), variant: z.string(), metric: z.string(), value: z.number() }),
  z.object({ kind: z.literal('range'), variant: z.string(), metric: z.string(), min: z.number(), max: z.number() }),
  z.object({ kind: z.literal('ordering'), before: z.string(), after: z.string() }),
  z.object({ kind: z.literal('invariant'), variant: z.string(), metric: z.string(), rule: z.string() }),
]);

export const registryRecordSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  chapter: z.number().int().min(1).max(6),
  status: z.enum(['active', 'excluded', 'retired']),
  claim: z.string().min(1),
  predicted: z.string().min(1),
  predictionBasis: z.string().min(1),
  primaryMetric: z.string().min(1),
  nullCriterion: z.string().min(1),
  expectedRelations: z.array(relationSchema),
  evidenceProfile: z.object({
    name: z.enum(['semantic', 'micro-timing', 'responsiveness']),
    passes: z.array(z.enum(PASS_FAMILIES)).min(1),
  }),
  applicability: z.string().min(1),
  control: z.object({
    referenceVariant: z.string(),
    compare: z.array(z.enum(['markup', 'behavior', 'domIdentity', 'focus', 'selection', 'state', 'declaredDifferences'])),
    intraVariant: z.array(z.string()),
    declaredDifferences: z.record(z.string(), z.array(z.string())),
  }),
  variants: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    excluded: z.boolean().optional(),
    expectedGateFailure: z.boolean().optional(),
    exclusionReason: reasonSchema.optional(),
  })).min(1),
});

export const registrySchema = z.array(registryRecordSchema).min(1);

const exactSchema = z.object({
  componentInvocations: z.record(z.string(), z.number().int().nonnegative()),
  commits: z.number().int().nonnegative(),
  setterCalls: z.number().int().nonnegative(),
  mutations: z.array(z.object({ type: z.string(), target: z.string() })),
  effectSetups: z.number().int().nonnegative(),
  effectCleanups: z.number().int().nonnegative(),
  refAttaches: z.number().int().nonnegative(),
  refDetaches: z.number().int().nonnegative(),
  lifecycle: z.array(z.object({ event: z.string(), at: z.number() })),
  discardedWorkLowerBound: z.number().int().nonnegative(),
});

const behaviorSchema = z.object({
  canonicalMarkup: z.string(),
  state: z.record(z.string(), z.unknown()),
  domIdentityPreserved: z.boolean(),
  focus: z.string().nullable(),
  selection: z.object({ start: z.number().nullable(), end: z.number().nullable() }).nullable(),
  liveProperties: z.record(z.string(), z.unknown()),
  frames: z.array(z.object({ at: z.number(), state: z.string() })),
  consistency: z.record(z.string(), z.unknown()),
  lifecycle: z.array(z.object({ event: z.string(), at: z.number() })),
});

const microSchema = z.object({
  micro_script_ms: z.number().nonnegative(),
  micro_layout_ms: z.number().nonnegative().nullable(),
  micro_total_ms: z.number().nonnegative(),
  micro_e2e_ms: z.number().nonnegative(),
  profiler_actual_ms: z.number().nonnegative().nullable(),
  profiler_callback_count: z.number().int().nonnegative(),
});

const responsiveSchema = z.object({
  responsive_elapsed_ms: z.number().nonnegative(),
  responsive_max_gap_ms: z.number().nonnegative(),
  responsive_ticks: z.number().int().nonnegative(),
  responsive_gaps_over_16: z.number().int().nonnegative(),
  responsive_long_tasks: z.array(z.number().nonnegative()),
  responsive_long_task_offsets: z.array(z.number().nonnegative()),
});

export const observationSchema = z.object({
  scenarioId: z.string(),
  variantId: z.string(),
  pass: z.enum(PASS_FAMILIES),
  processIndex: z.number().int().nonnegative(),
  rotationIndex: z.number().int().nonnegative(),
  iteration: z.number().int().nonnegative(),
  orderIndex: z.number().int().nonnegative(),
  excluded: z.boolean(),
  exclusionReason: reasonSchema.nullable(),
  instruments: z.array(z.string()),
  durationMs: z.number().nonnegative(),
  observed: z.object({
    exact: exactSchema.optional(),
    behavior: behaviorSchema.optional(),
    micro: microSchema.optional(),
    responsiveness: responsiveSchema.optional(),
  }),
});

export const resultSchema = z.object({
  schemaVersion: z.literal(1),
  manifest: z.record(z.string(), z.unknown()),
  verdicts: z.array(z.object({
    scenarioId: z.string(),
    verdict: z.enum(VERDICTS),
    reasons: z.array(reasonSchema),
  })),
  observations: z.array(observationSchema),
});
