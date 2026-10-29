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
  ['science explorer page integration', '<ScienceExplorer openCourse={openCourse} openQuestionBank={()=>setSection(\'practice\')} />', appSource],
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

if (failed) process.exit(1);
console.log(`\nStatic verification passed for ${files.length} TypeScript source files.`);
console.log('Note: this is not a substitute for `npm run typecheck` or `npm run build`.');
