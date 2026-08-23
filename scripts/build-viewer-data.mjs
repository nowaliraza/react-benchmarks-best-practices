import fs from 'node:fs/promises';
import path from 'node:path';
import { registry } from '../src/registry.js';

const root = process.cwd();
const output = path.join(root, 'src/viewer/generated-results.json');
const phaseDefinitions = [
  { phase: 1, title: 'Foundations', chapters: [1, 2, 3], report: 'reports/phase-1-foundations.md' },
  { phase: 2, title: 'Concurrency', chapters: [4], report: 'reports/phase-2-concurrency.md' },
  { phase: 3, title: 'Effects & boundaries', chapters: [5], report: 'reports/phase-3-effects.md' },
  { phase: 4, title: 'Builds & observers', chapters: [6], report: 'reports/phase-4-builds-observers.md' },
];
const chapterTitles = {
  1: 'Trust the instruments',
  2: 'Place and preserve identity',
  3: 'Read the update boundary',
  4: 'Separate render from commit',
  5: 'Synchronize only at boundaries',
  6: 'Measure the measuring apparatus',
};

function compactObserved(observed) {
  if (observed.exact) {
    return {
      exact: {
        ...observed.exact,
        mutationCount: observed.exact.mutations.length,
        mutations: observed.exact.mutations.slice(0, 8),
      },
    };
  }
  if (observed.behavior) {
    return {
      behavior: {
        state: observed.behavior.state,
        domIdentityPreserved: observed.behavior.domIdentityPreserved,
        focus: observed.behavior.focus,
        frames: observed.behavior.frames,
        consistency: observed.behavior.consistency,
        lifecycle: observed.behavior.lifecycle,
      },
    };
  }
  if (observed.responsiveness) {
    return {
      responsiveness: {
        ...observed.responsiveness,
        responsive_long_task_count: observed.responsiveness.responsive_long_tasks.length,
        responsive_long_tasks: observed.responsiveness.responsive_long_tasks.slice(0, 8),
        responsive_long_task_offsets: observed.responsiveness.responsive_long_task_offsets.slice(0, 8),
      },
    };
  }
  return observed;
}

function compactSummary(summary) {
  return Object.fromEntries(Object.entries(summary).map(([key, value]) => {
    if (!Array.isArray(value)) return [key, value];
    const unique = [...new Set(value.map((item) => JSON.stringify(item)))].map((item) => JSON.parse(item));
    return [key, { sampleCount: value.length, unique: unique.slice(0, 8) }];
  }));
}

const releases = [];
const resultsByChapter = new Map();
for (const definition of phaseDefinitions) {
  const results = [];
  for (const chapter of definition.chapters) {
    const file = path.join(root, `datasets/phase-${definition.phase}/chapter-${chapter}-result.json`);
    const result = JSON.parse(await fs.readFile(file, 'utf8'));
    results.push(result);
    resultsByChapter.set(chapter, result);
  }
  const observations = results.flatMap((result) => result.observations);
  const verdicts = results.flatMap((result) => result.verdicts);
  const manifest = results.at(-1).manifest;
  releases.push({
    ...definition,
    observationCount: observations.length,
    scenarioCount: verdicts.length,
    verdictCounts: Object.fromEntries([...new Set(verdicts.map(({ verdict }) => verdict))].map((verdict) => [
      verdict,
      verdicts.filter((item) => item.verdict === verdict).length,
    ])),
    gateIssueCount: results.reduce((count, result) => count + result.gate.issues.length, 0),
    manifest: {
      reactVersion: manifest.reactVersion,
      reactDomVersion: manifest.reactDomVersion,
      chromeVersion: manifest.chromeVersion,
      nodeVersion: manifest.nodeVersion,
      protocolVersion: manifest.protocolVersion,
      implementationCommit: manifest.implementationCommit,
      registryHash: manifest.registryHash,
      timestamp: manifest.timestamp,
      buildTypes: manifest.buildTypes ?? [manifest.buildType],
    },
  });
}

const scenarios = registry.map((record) => {
  const result = resultsByChapter.get(record.chapter);
  const verdict = result.verdicts.find(({ scenarioId }) => scenarioId === record.id);
  const summaries = result.summaries.filter(({ scenarioId }) => scenarioId === record.id).map(compactSummary);
  const observations = result.observations.filter(({ scenarioId, excluded }) => scenarioId === record.id && !excluded);
  const exemplarKeys = new Set();
  const exemplars = [];
  for (const observation of observations) {
    const key = `${observation.variantId}:${observation.pass}`;
    if (exemplarKeys.has(key)) continue;
    exemplarKeys.add(key);
    exemplars.push({
      variantId: observation.variantId,
      pass: observation.pass,
      buildType: observation.buildType,
      strictMode: observation.strictMode,
      processIndex: observation.processIndex,
      rotationIndex: observation.rotationIndex,
      iteration: observation.iteration,
      durationMs: observation.durationMs,
      instruments: observation.instruments,
      observed: compactObserved(observation.observed),
    });
  }
  return {
    id: record.id,
    chapter: record.chapter,
    chapterTitle: chapterTitles[record.chapter],
    phase: phaseDefinitions.find(({ chapters }) => chapters.includes(record.chapter)).phase,
    status: record.status,
    claim: record.claim,
    predicted: record.predicted,
    predictionBasis: record.predictionBasis,
    primaryMetric: record.primaryMetric,
    nullCriterion: record.nullCriterion,
    applicability: record.applicability,
    evidenceProfile: record.evidenceProfile,
    expectedRelations: record.expectedRelations,
    control: record.control,
    variants: record.variants,
    verdict,
    summaries,
    exemplars,
  };
});

const payload = {
  generatedFrom: 'versioned publication datasets',
  releases,
  chapters: Object.entries(chapterTitles).map(([chapter, title]) => ({
    chapter: Number(chapter),
    title,
    scenarioCount: scenarios.filter((scenario) => scenario.chapter === Number(chapter)).length,
  })),
  scenarios,
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Viewer data: ${scenarios.length} scenarios from ${releases.length} releases -> ${output}`);
