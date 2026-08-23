import { useEffect, useMemo, useState } from 'react';
import data from './generated-results.json';
import { buildReplaySteps, filterScenarios, observableSummary, summaryMetrics } from './model.js';

const curriculumNotes = {
  1: { eyebrow: 'Calibration', intro: 'Before trusting a React conclusion, prove each ruler can detect the signal it names.', question: 'Which observable would falsify this claim?' },
  2: { eyebrow: 'Scope', intro: 'State placement and reference identity decide how far an update travels through the component tree.', question: 'What stayed referentially identical?' },
  3: { eyebrow: 'Queues', intro: 'A callback, a task boundary, and a forced flush produce different update and presentation boundaries.', question: 'Did the browser present every React commit?' },
  4: { eyebrow: 'Concurrency', intro: 'Concurrent render work may pause or disappear; commit work remains a synchronous boundary.', question: 'Was the measured cost render work or host commit work?' },
  5: { eyebrow: 'Synchronization', intro: 'Effects, refs, and memoization are boundary tools. Their costs become clear when identity is controlled.', question: 'Could this value have been derived during render?' },
  6: { eyebrow: 'Observer effect', intro: 'Instrumentation changes the experiment. Quantify that change before interpreting a timing result.', question: 'Which instruments were active in this cell?' },
};

function LabMark() {
  return (
    <svg className="lab-mark" viewBox="0 0 42 42" aria-hidden="true">
      <path d="M8 8h10v10H8zM24 8h10v10H24zM8 24h10v10H8z" />
      <path className="lab-mark-signal" d="M24 29h4l2-5 4 10" />
    </svg>
  );
}

function Verdict({ value }) {
  return <span className={`verdict verdict-${value}`}>{value}</span>;
}

function Topbar({ view, onView }) {
  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={() => onView('evidence')} aria-label="React Reality Lab home">
        <LabMark />
        <span><strong>React Reality Lab</strong><small>Evidence console · protocol 0.1.0</small></span>
      </button>
      <nav className="mode-switch" aria-label="Console mode">
        <button className={view === 'evidence' ? 'active' : ''} type="button" onClick={() => onView('evidence')}>Explore evidence</button>
        <button className={view === 'curriculum' ? 'active' : ''} type="button" onClick={() => onView('curriculum')}>Guided course</button>
      </nav>
      <div className="release-state"><i /> 4 releases verified</div>
    </header>
  );
}

function ReleaseRail({ releases, phase, onPhase }) {
  return (
    <div className="release-rail" aria-label="Published releases">
      <button type="button" className={phase === 'all' ? 'active' : ''} onClick={() => onPhase('all')}>
        <span>All evidence</span><strong>{releases.reduce((sum, item) => sum + item.observationCount, 0).toLocaleString()}</strong><small>observations</small>
      </button>
      {releases.map((release) => (
        <button type="button" className={phase === String(release.phase) ? 'active' : ''} onClick={() => onPhase(String(release.phase))} key={release.phase}>
          <span>Phase {release.phase}</span><strong>{release.observationCount}</strong><small>{release.title}</small>
        </button>
      ))}
    </div>
  );
}

function ScenarioIndex({ scenarios, selectedId, onSelect, query, onQuery, phase, onPhase }) {
  const groups = data.chapters.map((chapter) => ({ ...chapter, items: scenarios.filter((item) => item.chapter === chapter.chapter) })).filter(({ items }) => items.length > 0);
  return (
    <aside className="scenario-index">
      <div className="search-wrap">
        <label htmlFor="evidence-search">Find a claim or variant</label>
        <div><span aria-hidden="true">⌕</span><input id="evidence-search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="memo, Strict, commit…" /></div>
      </div>
      <div className="phase-pills" aria-label="Filter by phase">
        <button className={phase === 'all' ? 'active' : ''} type="button" onClick={() => onPhase('all')}>All</button>
        {data.releases.map(({ phase: item }) => <button className={phase === String(item) ? 'active' : ''} type="button" onClick={() => onPhase(String(item))} key={item}>P{item}</button>)}
      </div>
      <label className="mobile-scenario-select">Published claim
        <select value={scenarios.some(({ id }) => id === selectedId) ? selectedId : ''} onChange={(event) => onSelect(event.target.value)}>
          <option value="" disabled>Select a matching claim</option>
          {scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.id.replace(/-/g, ' ')}</option>)}
        </select>
      </label>
      <div className="scenario-scroll">
        {groups.map((group) => (
          <section className="scenario-group" key={group.chapter}>
            <h2><span>Chapter {group.chapter}</span>{group.title}</h2>
            {group.items.map((scenario) => (
              <button className={scenario.id === selectedId ? 'active' : ''} type="button" onClick={() => onSelect(scenario.id)} key={scenario.id}>
                <span className={`status-dot status-${scenario.verdict.verdict}`} />
                <span>{scenario.id.replace(/-/g, ' ')}</span>
                <small>{scenario.variants.length}</small>
              </button>
            ))}
          </section>
        ))}
        {groups.length === 0 ? <p className="empty-state">No published claim matches that search.</p> : null}
      </div>
    </aside>
  );
}

function EvidenceTrace({ scenario, exemplar }) {
  return (
    <section className="evidence-trace" aria-label="Evidence trace">
      <article>
        <span className="trace-index">P</span>
        <div><small>Preregistered prediction</small><p>{scenario.predicted}</p></div>
      </article>
      <article>
        <span className="trace-index trace-observed">O</span>
        <div><small>Recorded observation</small><p>{observableSummary(exemplar)}</p></div>
      </article>
      <article>
        <span className={`trace-index trace-${scenario.verdict.verdict}`}>V</span>
        <div><small>Publication verdict</small><p>{scenario.verdict.verdict === 'supported' ? 'The preregistered relations held across the publication envelope.' : scenario.verdict.reasons[0]?.message ?? 'See the structured verdict reason.'}</p></div>
      </article>
    </section>
  );
}

function Replay({ scenario, exemplarKey, onExemplar }) {
  const exemplar = scenario.exemplars.find((item) => `${item.variantId}::${item.pass}` === exemplarKey) ?? scenario.exemplars[0];
  const steps = buildReplaySteps(exemplar);
  const [cursor, setCursor] = useState(steps.length - 1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setCursor(0);
    setPlaying(false);
  }, [exemplarKey, scenario.id]);

  useEffect(() => {
    if (!playing) return undefined;
    if (cursor >= steps.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => setCursor((current) => current + 1), 800);
    return () => clearTimeout(timer);
  }, [cursor, playing, steps.length]);

  return (
    <section className="replay-panel">
      <div className="panel-heading">
        <div><span>Recorded replay</span><h2>Walk the observable boundaries</h2><p>This replays one published row; it does not rerun or animate React internals.</p></div>
        <label>Evidence cell<select value={exemplarKey} onChange={(event) => onExemplar(event.target.value)}>{scenario.exemplars.map((item) => <option value={`${item.variantId}::${item.pass}`} key={`${item.variantId}:${item.pass}`}>{item.variantId} · {item.pass}</option>)}</select></label>
      </div>
      <div className="replay-stage">
        <div className="replay-controls">
          <button type="button" onClick={() => { if (cursor >= steps.length - 1) setCursor(0); setPlaying((value) => !value); }}>{playing ? 'Pause replay' : 'Play replay'}</button>
          <span>{String(cursor + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span>
          <input aria-label="Replay position" type="range" min="0" max={Math.max(0, steps.length - 1)} value={cursor} onChange={(event) => { setPlaying(false); setCursor(Number(event.target.value)); }} />
        </div>
        <ol className="replay-track">
          {steps.map((step, index) => (
            <li className={`${index <= cursor ? 'revealed' : ''} ${index === cursor ? 'current' : ''}`} key={`${step.label}:${index}`}>
              <button type="button" onClick={() => { setPlaying(false); setCursor(index); }} aria-label={`Go to ${step.label}`}><i className={step.tone ?? ''} /></button>
              <small>{step.label}</small><strong>{step.value}</strong><p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SummaryTable({ scenario }) {
  const [pass, setPass] = useState('all');
  const passes = [...new Set(scenario.summaries.map((summary) => summary.pass))];
  const visible = scenario.summaries.filter((summary) => pass === 'all' || summary.pass === pass);
  return (
    <section className="summary-panel">
      <div className="panel-heading compact">
        <div><span>Derived summaries</span><h2>Every variant, same evidence family</h2></div>
        <div className="mini-tabs"><button type="button" className={pass === 'all' ? 'active' : ''} onClick={() => setPass('all')}>All</button>{passes.map((item) => <button type="button" className={pass === item ? 'active' : ''} onClick={() => setPass(item)} key={item}>{item}</button>)}</div>
      </div>
      <div className="summary-grid">
        {visible.map((summary) => (
          <article key={`${summary.variantId}:${summary.pass}`}>
            <header><div><strong>{summary.variantId}</strong><small>{summary.pass}</small></div><span>{summary.sampleCount} rows</span></header>
            <dl>{summaryMetrics(summary).slice(0, 8).map((metric) => <div key={metric.name}><dt>{metric.label}</dt><dd>{metric.formatted}</dd></div>)}</dl>
            {summaryMetrics(summary).length === 0 ? <p className="semantic-note">Exact relations are evaluated directly over all raw rows; no pooled timing statistic is substituted.</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function MethodDrawer({ scenario }) {
  const release = data.releases.find(({ phase }) => phase === scenario.phase);
  return (
    <details className="method-drawer">
      <summary><span>Inspect controls and applicability</span><small>manifest {release.manifest.implementationCommit.slice(0, 8)}</small></summary>
      <div>
        <article><h3>Applicability</h3><p>{scenario.applicability}</p></article>
        <article><h3>Correctness control</h3><p>Reference: <code>{scenario.control.referenceVariant}</code></p><p>Compared: {scenario.control.compare.join(', ')}.</p></article>
        <article><h3>Null criterion</h3><p>{scenario.nullCriterion}</p></article>
        <article><h3>Manifest envelope</h3><p>React {release.manifest.reactVersion} · Chrome {release.manifest.chromeVersion} · {release.observationCount} phase observations · {release.gateIssueCount} gate issues.</p></article>
      </div>
    </details>
  );
}

function ScenarioDetail({ scenario }) {
  const initial = scenario.exemplars[0];
  const [exemplarKey, setExemplarKey] = useState(initial ? `${initial.variantId}::${initial.pass}` : '');
  const exemplar = scenario.exemplars.find((item) => `${item.variantId}::${item.pass}` === exemplarKey) ?? initial;
  useEffect(() => setExemplarKey(scenario.exemplars[0] ? `${scenario.exemplars[0].variantId}::${scenario.exemplars[0].pass}` : ''), [scenario.id, scenario.exemplars]);
  return (
    <article className="scenario-detail">
      <header className="scenario-hero">
        <div className="breadcrumb">Phase {scenario.phase} <i /> Chapter {scenario.chapter} <i /> {scenario.evidenceProfile.name}</div>
        <div className="hero-title"><div><p>{scenario.id}</p><h1>{scenario.claim}</h1></div><Verdict value={scenario.verdict.verdict} /></div>
        <p className="basis">{scenario.predictionBasis}</p>
        <div className="variant-line"><span>Variants</span>{scenario.variants.map(({ id, excluded }) => <code className={excluded ? 'excluded' : ''} key={id}>{id}</code>)}</div>
      </header>
      <EvidenceTrace scenario={scenario} exemplar={exemplar} />
      {scenario.exemplars.length > 0 ? <Replay scenario={scenario} exemplarKey={exemplarKey} onExemplar={setExemplarKey} key={scenario.id} /> : <p className="excluded-panel">This control is retained as excluded evidence. Its structured exclusion prevents the timer race from becoming a React claim.</p>}
      <SummaryTable scenario={scenario} key={`summary:${scenario.id}`} />
      <MethodDrawer scenario={scenario} />
    </article>
  );
}

function EvidenceView({ selectedId, onSelect }) {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('all');
  const filtered = useMemo(() => filterScenarios(data.scenarios, query, phase), [query, phase]);
  const selected = data.scenarios.find(({ id }) => id === selectedId) ?? data.scenarios[0];
  const changePhase = (nextPhase) => {
    setPhase(nextPhase);
    if (nextPhase !== 'all' && selected.phase !== Number(nextPhase)) {
      onSelect(data.scenarios.find((scenario) => scenario.phase === Number(nextPhase)).id);
    }
  };
  return (
    <>
      <ReleaseRail releases={data.releases} phase={phase} onPhase={changePhase} />
      <div className="console-grid">
        <ScenarioIndex scenarios={filtered} selectedId={selected.id} onSelect={onSelect} query={query} onQuery={setQuery} phase={phase} onPhase={changePhase} />
        <ScenarioDetail scenario={selected} />
      </div>
    </>
  );
}

function CurriculumSidebar({ chapter, onChapter, completed }) {
  return (
    <aside className="course-sidebar">
      <p>Six-chapter field guide</p><h1>Learn to read React evidence</h1>
      <div className="course-progress"><span><i style={{ width: `${Math.round((completed.size / data.scenarios.length) * 100)}%` }} /></span><small>{completed.size} of {data.scenarios.length} field notes complete</small></div>
      <nav>{data.chapters.map((item) => {
        const finished = data.scenarios.filter((scenario) => scenario.chapter === item.chapter).every((scenario) => completed.has(scenario.id));
        return <button type="button" className={chapter === item.chapter ? 'active' : ''} onClick={() => onChapter(item.chapter)} key={item.chapter}><span>{finished ? '✓' : item.chapter}</span><div><small>{curriculumNotes[item.chapter].eyebrow}</small><strong>{item.title}</strong></div></button>;
      })}</nav>
    </aside>
  );
}

function CourseLesson({ chapter, lessonIndex, onLesson, completed, onComplete }) {
  const lessons = data.scenarios.filter((scenario) => scenario.chapter === chapter);
  const scenario = lessons[Math.min(lessonIndex, lessons.length - 1)];
  const note = curriculumNotes[chapter];
  const exemplar = scenario.exemplars[0];
  const replay = buildReplaySteps(exemplar);
  const isComplete = completed.has(scenario.id);
  const hasNext = lessonIndex < lessons.length - 1 || chapter < data.chapters.length;
  const next = () => lessonIndex < lessons.length - 1 ? onLesson(chapter, lessonIndex + 1) : onLesson(chapter + 1, 0);
  return (
    <article className="course-lesson">
      <header><span>{note.eyebrow} · Field note {lessonIndex + 1}/{lessons.length}</span><h2>{scenario.claim}</h2><p>{note.intro}</p></header>
      <div className="lesson-lenses">
        <section><small>Ask first</small><h3>{note.question}</h3><p>{scenario.nullCriterion}</p></section>
        <section><small>Prediction</small><h3>State the expected relation before looking.</h3><p>{scenario.predicted}</p></section>
        <section className="lesson-verdict"><small>Then inspect</small><h3><Verdict value={scenario.verdict.verdict} /></h3><p>{observableSummary(exemplar)}</p></section>
      </div>
      <section className="boundary-map">
        <div><span>Boundary map</span><h3>What the apparatus could see</h3></div>
        <ol>{replay.slice(1).map((step, index) => <li key={`${step.label}:${index}`}><i /><small>{step.label}</small><strong>{step.value}</strong></li>)}</ol>
      </section>
      <blockquote><span>Lab discipline</span>{scenario.applicability}</blockquote>
      <footer>
        <div className="lesson-dots">{lessons.map((item, index) => <button aria-label={`Open field note ${index + 1}: ${item.id}`} className={`${index === lessonIndex ? 'active' : ''} ${completed.has(item.id) ? 'complete' : ''}`} type="button" onClick={() => onLesson(chapter, index)} key={item.id} />)}</div>
        <div><button className="complete-button" type="button" onClick={() => onComplete(scenario.id)}>{isComplete ? 'Marked complete ✓' : 'Mark field note complete'}</button>{hasNext ? <button className="next-button" type="button" onClick={next}>Next field note <span>→</span></button> : null}</div>
      </footer>
    </article>
  );
}

function CurriculumView() {
  const [chapter, setChapter] = useState(1);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [completed, setCompleted] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('react-reality-course-v1') ?? '[]')); } catch { return new Set(); }
  });
  const move = (nextChapter, nextIndex) => { setChapter(nextChapter); setLessonIndex(nextIndex); };
  const toggleComplete = (id) => setCompleted((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    try { localStorage.setItem('react-reality-course-v1', JSON.stringify([...next])); } catch { /* Storage is optional. */ }
    return next;
  });
  return (
    <div className="course-grid">
      <CurriculumSidebar chapter={chapter} onChapter={(value) => move(value, 0)} completed={completed} />
      <CourseLesson chapter={chapter} lessonIndex={lessonIndex} onLesson={move} completed={completed} onComplete={toggleComplete} />
    </div>
  );
}

export function App({ initialView = 'evidence' }) {
  const initialScenario = location.hash.slice(1);
  const [view, setView] = useState(initialView);
  const [selectedId, setSelectedId] = useState(data.scenarios.some(({ id }) => id === initialScenario) ? initialScenario : 'render-commit-dom-boundary');
  const selectScenario = (id) => { setSelectedId(id); history.replaceState(null, '', `#${id}`); };
  return (
    <div className="app-shell">
      <Topbar view={view} onView={setView} />
      {view === 'evidence' ? <EvidenceView selectedId={selectedId} onSelect={selectScenario} /> : <CurriculumView />}
      <footer className="global-footer"><span>React Reality Lab</span><p>Observable evidence, not reconciler folklore.</p><code>34 scenarios · 1,962 observations · 0 hidden fibers</code></footer>
    </div>
  );
}
