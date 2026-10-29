import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
}
walk(srcRoot);
let failed = false;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    failed = true;
    console.error(`FAIL syntax: ${path.relative(root, file)}`);
    for (const error of errors) console.error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  } else console.log(`PASS syntax: ${path.relative(root, file)}`);
}

const coursesPath = path.join(srcRoot, 'data', 'courses.ts');
const coursesSource = ts.createSourceFile(coursesPath, fs.readFileSync(coursesPath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
let courseCount = null;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(coursesSource) === 'courses' && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
    courseCount = node.initializer.elements.length;
  }
  ts.forEachChild(node, visit);
}
visit(coursesSource);
if (courseCount !== 21) {
  failed = true;
  console.error(`FAIL course count: expected 21, found ${courseCount ?? 'not detected'}`);
} else console.log('PASS course count: 21');


const enhancementPath = path.join(srcRoot, 'data', 'chapterEnhancements.ts');
const enhancementSource = fs.readFileSync(enhancementPath, 'utf8');
const chapterEntries = [...enhancementSource.matchAll(/^  (\d+): \{/gm)].map(m => Number(m[1]));
const expectedDays = Array.from({ length: 21 }, (_, i) => i + 1);
if (chapterEntries.length !== 21 || expectedDays.some(day => !chapterEntries.includes(day))) {
  failed = true;
  console.error(`FAIL textbook enhancements: expected chapters 1–21, found ${chapterEntries.length}`);
} else console.log('PASS textbook enhancements: chapters 1–21');
const termBlocks = (enhancementSource.match(/terms: \[\{/g) ?? []).length;
const reviewBlocks = (enhancementSource.match(/review: \[\{/g) ?? []).length;
if (termBlocks !== 21 || reviewBlocks !== 21) {
  failed = true;
  console.error(`FAIL chapter review material: terms=${termBlocks}, review=${reviewBlocks}`);
} else console.log('PASS chapter review material: 21 term sets and 21 review sets');


const questionBankPath = path.join(srcRoot, 'data', 'questionBank.ts');
const questionBankSource = fs.readFileSync(questionBankPath, 'utf8');
const deeperQuestionDays = [...questionBankSource.matchAll(/\{day:(\d+),level:/g)].map(m => Number(m[1]));
if (deeperQuestionDays.length !== 21 || expectedDays.some(day => !deeperQuestionDays.includes(day))) {
  failed = true;
  console.error(`FAIL advanced question bank: expected 21 advanced questions, found ${deeperQuestionDays.length}`);
} else console.log('PASS advanced question bank: 21 additional chapter questions');
if (!fs.existsSync(path.join(srcRoot, 'components', 'QuestionBank.tsx'))) {
  failed = true;
  console.error('FAIL question bank component missing');
} else console.log('PASS question bank component');

const deepeningPath = path.join(srcRoot, 'data', 'biologicalDeepening.ts');
const deepeningSource = fs.readFileSync(deepeningPath, 'utf8');
const deepeningDays = [...deepeningSource.matchAll(/^  (\d+): \{/gm)].map(m => Number(m[1]));
const deepeningFields = ['mechanism:', 'distinction:', 'application:', 'evidence:'];
if (deepeningDays.length !== 21 || expectedDays.some(day => !deepeningDays.includes(day)) || deepeningFields.some(field => (deepeningSource.match(new RegExp(field, 'g')) ?? []).length !== 22)) {
  failed = true;
  console.error('FAIL biological knowledge deepening: expected 21 chapters × 4 fields');
} else console.log('PASS biological knowledge deepening: 21 chapters × mechanism, distinction, application and evidence');

const appSource = fs.readFileSync(path.join(srcRoot, 'App.tsx'), 'utf8');
const questionComponentSource = fs.readFileSync(path.join(srcRoot, 'components', 'QuestionBank.tsx'), 'utf8');
const featureChecks = [
  ['textbook library section', "section==='library'", appSource],
  ['bookmark persistence', 'bio21-library-v1', appSource],
  ['personal notes editor', '我的本章笔记', appSource],
  ['JSON notes export', 'bio21-my-learning-notes.json', appSource],
  ['JSON notes import', '导入 Bio21 笔记备份', appSource],
  ['Markdown notes export', 'bio21-learning-notes.md', appSource],
  ['visual diagram atlas', 'VISUAL LEARNING ATLAS', appSource],
  ['clickable glossary cross-links', 'className="term-link"', appSource],
  ['full-text search', 'libraryResults', appSource],
  ['question bank navigation', 'label="章节题库"', appSource],
  ['question bank component', 'QuestionBank', appSource],
  ['wrong-answer review', "mode === 'wrong'", questionComponentSource],
  ['question bank persistence', 'bio21-question-bank-v1', questionComponentSource],
  ['timed comprehensive exam', 'BIO21 MOCK EXAM', questionComponentSource],
  ['randomized exam set', 'setExamQuestions(pool)', questionComponentSource],
  ['exam scoring and explanations', 'examScore', questionComponentSource],
  ['personal best score persistence', 'bio21-exam-best-v2', questionComponentSource],
  ['phase mastery report', 'phaseMastery', appSource],
  ['Markdown learning report export', 'bio21-learning-report.md', appSource],
  ['JSON learning report export', 'bio21-learning-report.json', appSource],
  ['adaptive review recommendation', 'weakestPhase', appSource],
  ['biological knowledge deepening UI', '生物知识深化', appSource],
  ['mechanism-to-evidence data binding', 'biologicalDeepening[course.day].evidence', appSource],
];
for (const [label, token, source] of featureChecks) {
  if (!source.includes(token)) { failed = true; console.error(`FAIL feature check: ${label}`); }
  else console.log(`PASS feature check: ${label}`);
}


const sciencePath = path.join(srcRoot, 'components', 'ScienceExplorer.tsx');
const scienceSource = fs.readFileSync(sciencePath, 'utf8');
const scienceChecks = [
  ['concept graph nodes', 'const topics:Topic[]', scienceSource],
  ['PCR prerequisite chain', '前置知识链', scienceSource],
  ['DNA replication animation', 'DNA 复制', scienceSource],
  ['transcription and translation animation', '转录与翻译', scienceSource],
  ['PCR mechanism animation', 'PCR 三阶段', scienceSource],
  ['Sanger sequencing animation', 'Sanger 测序', scienceSource],
  ['fermentation process animation', '发酵过程', scienceSource],
  ['trusted reference list', 'const sources = [', scienceSource],
  ['science explorer navigation', 'label="生物知识探索"', appSource],
  ['science explorer page integration', '<ScienceExplorer openCourse={openCourse}', appSource],
];
for (const [label, token, source] of scienceChecks) {
  if (!source.includes(token)) { failed = true; console.error(`FAIL science feature: ${label}`); }
  else console.log(`PASS science feature: ${label}`);
}

const networkSource = fs.readFileSync(path.join(srcRoot, 'components', 'ScienceExplorer.tsx'), 'utf8');
const networkChecks = [
  ['directed dependency edges', "type Dependency =", networkSource],
  ['edge explanations', 'reason:', networkSource],
  ['textbook paragraph mapping', 'textbook[meta?.day ?? 1].reading', networkSource],
  ['question performance linkage', 'bio21-question-bank-v1', networkSource],
  ['weakness marker', 'has-weakness', networkSource],
  ['source references per node', 'sourceIndexes', networkSource],
  ['open question bank action', 'openQuestionBank', networkSource],
];
for (const [label, token, source] of networkChecks) {
  if (!source.includes(token)) { failed = true; console.error(`FAIL knowledge network: ${label}`); }
  else console.log(`PASS knowledge network: ${label}`);
}
const edgeCount = (networkSource.match(/\{from:'[^']+',to:'[^']+',type:'(?:prerequisite|mechanism|application)',reason:/g) ?? []).length;
if (edgeCount < 15) { failed = true; console.error(`FAIL knowledge network edges: expected at least 15, found ${edgeCount}`); }
else console.log(`PASS knowledge network: ${edgeCount} explicitly explained directed edges`);

for (const file of ['index.html', 'netlify.toml', 'public/_redirects', 'README.md']) {
  if (!fs.existsSync(path.join(root, file))) {
    failed = true;
    console.error(`FAIL required file missing: ${file}`);
  } else console.log(`PASS required file: ${file}`);
}


const diagnosisChecks = [
  ['concept diagnosis tab', "id:'diagnosis',label:'概念级诊断'", networkSource],
  ['explicit concept question mapping', 'const conceptQuestionMap:', networkSource],
  ['question record based diagnosis', "r?.correct===false", networkSource],
  ['prerequisite gap recommendation', 'missingPrereqs', networkSource],
  ['repeat-answer caveat', '多次作答均正确（初步信号）', networkSource],
  ['diagnosis limitation notice', '课程级的近似映射', networkSource],
  ['responsive diagnostic cards', '.concept-diagnosis-list', fs.readFileSync(path.join(srcRoot, 'styles.css'), 'utf8')],
];
for (const [label, token, source] of diagnosisChecks) {
  if (!source.includes(token)) { failed = true; console.error(`FAIL concept diagnosis: ${label}`); }
  else console.log(`PASS concept diagnosis: ${label}`);
}
const conceptMapMatch = networkSource.match(/const conceptQuestionMap: Record<string,string\[\]> = \{([\s\S]*?)\n\};/);
const conceptMapIds = conceptMapMatch ? [...conceptMapMatch[1].matchAll(/'(?:core|deep)-(\d+)'/g)].map(m => Number(m[1])) : [];
if (!conceptMapMatch || new Set([...conceptMapMatch[1].matchAll(/([a-z]+):\[/g)].map(m => m[1])).size !== 10 || conceptMapIds.some(day => day < 1 || day > 21)) {
  failed = true; console.error('FAIL concept question mapping: expected 10 concepts with valid question IDs');
} else console.log(`PASS concept question mapping: 10 concepts, ${conceptMapIds.length} valid question references`);

// ── 生物学概念库 ────────────────────────────────────────────
const conceptsDir = path.join(srcRoot, 'data', 'concepts');
const conceptFiles = {
  core: 'core.ts',
  aligned: 'aligned.ts',
  life: 'life.ts',
  molecular: 'molecular.ts',
  genetics: 'genetics.ts',
  experiment: 'experiment.ts',
  bioinformatics: 'bioinformatics.ts',
  biomanufacturing: 'biomanufacturing.ts',
  synbio: 'synbio.ts',
};
const conceptEntries = [];
let conceptFilesMissing = false;
for (const [key, file] of Object.entries(conceptFiles)) {
  const full = path.join(conceptsDir, file);
  if (!fs.existsSync(full)) {
    failed = true; conceptFilesMissing = true;
    console.error(`FAIL concept library file missing: ${file}`);
    continue;
  }
  const source = fs.readFileSync(full, 'utf8');
  const blocks = source.match(/\{\s*term:[\s\S]*?\n {2}\},/g) ?? [];
  for (const block of blocks) {
    const term = block.match(/term:\s*'([^']+)'/)?.[1];
    const alias = block.match(/alias:\s*'([^']*)'/)?.[1];
    const group = block.match(/group:\s*'([^']+)'/)?.[1];
    const summary = block.match(/summary:\s*'([^']*)'/)?.[1];
    const detail = block.match(/detail:\s*'([^']*)'/)?.[1];
    const misconception = block.match(/misconception:\s*'([^']*)'/)?.[1];
    const relatedMatch = block.match(/related:\s*\[([^\]]*)\]/)?.[1] ?? '';
    const related = [...relatedMatch.matchAll(/'([^']+)'/g)].map(m => m[1]);
    const chapter = Number(block.match(/chapter:\s*(\d+)/)?.[1]);
    if (!term || !group || !summary || !detail || !misconception || !Number.isInteger(chapter)) {
      failed = true; console.error(`FAIL concept entry missing required field in ${file}: ${term ?? '<unknown>'}`);
      continue;
    }
    conceptEntries.push({ term, alias, group, summary, detail, misconception, related, chapter, file: key });
  }
}
if (!conceptFilesMissing) {
  const planSource = fs.readFileSync(path.join(conceptsDir, 'plan.ts'), 'utf8');
  const planned = [...planSource.matchAll(/p\('(\w+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+)\)/g)]
    .map(m => ({ file: m[1], term: m[2], group: m[3], chapter: Number(m[4]) }));
  const planTerms = new Set(planned.map(p => p.term));

  const seen = new Map();
  for (const entry of conceptEntries) {
    if (seen.has(entry.term)) {
      failed = true;
      console.error(`FAIL duplicate concept term: ${entry.term} (${seen.get(entry.term)} and ${entry.file})`);
    } else seen.set(entry.term, entry.file);
  }
  const written = new Set(conceptEntries.map(e => e.term));
  const missing = planned.filter(p => !written.has(p.term));
  if (missing.length) {
    failed = true;
    console.error(`FAIL concept library coverage: ${missing.length} planned concepts missing: ${missing.slice(0, 8).map(m => m.term).join(', ')}${missing.length > 8 ? ' …' : ''}`);
  } else console.log(`PASS concept library coverage: all ${planned.length} planned concepts written`);

  const drifted = conceptEntries.filter(e => {
    const plan = planned.find(p => p.term === e.term);
    return plan && (plan.group !== e.group || plan.chapter !== e.chapter);
  });
  if (drifted.length) {
    failed = true;
    console.error(`FAIL concept metadata drift: ${drifted.map(d => `${d.term}(group/chapter)`).slice(0, 8).join(', ')}`);
  } else console.log('PASS concept metadata: group and chapter match the registry');

  const dangling = conceptEntries.flatMap(e => e.related.filter(r => !planTerms.has(r)).map(r => `${e.term} → ${r}`));
  const selfRefs = conceptEntries.flatMap(e => e.related.filter(r => r === e.term).map(r => e.term));
  if (dangling.length) {
    failed = true;
    console.error(`FAIL dangling concept references: ${dangling.slice(0, 8).join(', ')}${dangling.length > 8 ? ' …' : ''}`);
  } else console.log('PASS concept references: every related term resolves in the registry');
  if (selfRefs.length) {
    failed = true;
    console.error(`FAIL self-referencing concepts: ${selfRefs.slice(0, 5).join(', ')}`);
  }
  const thin = conceptEntries.filter(e => e.related.length < 2 || e.related.length > 3);
  if (thin.length) {
    failed = true;
    console.error(`FAIL concept relation count: ${thin.length} entries outside 2–3 related terms`);
  } else console.log('PASS concept relations: every entry links 2–3 related concepts');

  const badChapter = conceptEntries.filter(e => e.chapter < 1 || e.chapter > 21);
  if (badChapter.length) {
    failed = true;
    console.error(`FAIL concept chapter range: ${badChapter.length} entries outside chapters 1–21`);
  } else console.log('PASS concept chapters: all entries map to chapters 1–21');

  const groups = new Set(conceptEntries.map(e => e.group));
  console.log(`PASS concept library: ${conceptEntries.length} entries across ${groups.size} disciplines`);

  // 教材「关键术语」必须能在概念库中查到，避免学习者点击术语后无结果。
  const enhancementSource = fs.readFileSync(path.join(srcRoot, 'data', 'chapterEnhancements.ts'), 'utf8');
  const chapterTerms = [...enhancementSource.matchAll(/\{term:'([^']+)'/g)].map(m => m[1]);
  const uncovered = chapterTerms.filter(t => !planTerms.has(t));
  if (uncovered.length) {
    failed = true;
    console.error(`FAIL chapter term coverage: ${uncovered.length} textbook terms missing from the concept library: ${uncovered.slice(0, 8).join(', ')}${uncovered.length > 8 ? ' …' : ''}`);
  } else console.log(`PASS chapter term coverage: all ${chapterTerms.length} textbook terms are in the concept library`);
}

const conceptBrowserPath = path.join(srcRoot, 'components', 'ConceptBrowser.tsx');
if (!fs.existsSync(conceptBrowserPath)) {
  failed = true; console.error('FAIL concept browser component missing');
} else {
  const browserSource = fs.readFileSync(conceptBrowserPath, 'utf8');
  const browserChecks = [
    ['concept browser navigation', 'label="生物学概念库"', appSource],
    ['concept browser page integration', '<ConceptBrowser openCourse={openCourse}', appSource],
    ['concept browser focus entry', 'focusTerm={conceptFocus}', appSource],
    ['concept group filter', 'concept-group-filter', browserSource],
    ['concept cross linking', 'focusConcept', browserSource],
    ['concept chapter jump', 'openCourse(item.chapter)', browserSource],
    ['concept library data binding', 'conceptLibrary', browserSource],
    ['concept boundary display', 'concept-boundary', browserSource],
  ];
  for (const [label, token, source] of browserChecks) {
    if (!source.includes(token)) { failed = true; console.error(`FAIL concept browser: ${label}`); }
    else console.log(`PASS concept browser: ${label}`);
  }
}

if (failed) process.exit(1);
console.log(`\nStatic verification passed for ${files.length} TypeScript source files.`);
console.log('Note: this is not a substitute for `npm run typecheck` or `npm run build`.');
