import { useEffect, useMemo, useState } from 'react';
import { courses } from '../data/courses';
import { deeperQuestions, type BankQuestion } from '../data/questionBank';

type RecordMap = Record<string, { correct: boolean; attempts: number }>;
const STORAGE_KEY = 'bio21-question-bank-v1';
const coreQuestions: BankQuestion[] = courses.map((course) => ({
  id: `core-${course.day}`,
  day: course.day,
  prompt: course.quiz.question,
  options: course.quiz.options,
  answer: course.quiz.answer,
  explanation: course.quiz.explanation,
  level: '基础',
}));
const questions: BankQuestion[] = [...coreQuestions, ...deeperQuestions.map((question) => ({ ...question, id: `deep-${question.day}` }))];
const phases = ['全部阶段', ...Array.from(new Set(courses.map((course) => course.phase)))];

function readRecords(): RecordMap {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, { correct: boolean; attempts: number }] => {
      const value = entry[1];
      return Boolean(value && typeof value === 'object' && typeof (value as Record<string, unknown>).correct === 'boolean' && typeof (value as Record<string, unknown>).attempts === 'number');
    }));
  } catch { return {}; }
}

export default function QuestionBank({ openCourse }: { openCourse: (day: number) => void }) {
  const [records, setRecords] = useState<RecordMap>(readRecords);
  const [phase, setPhase] = useState('全部阶段');
  const [mode, setMode] = useState<'all' | 'wrong' | 'unanswered'>('all');
  const [level, setLevel] = useState<'全部难度' | '基础' | '进阶'>('全部难度');
  const [activeId, setActiveId] = useState(questions[0].id);
  const [choice, setChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [examQuestions, setExamQuestions] = useState<BankQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examSeconds, setExamSeconds] = useState(15 * 60);
  const [bestExamScore, setBestExamScore] = useState<number>(() => { try { return Number(localStorage.getItem('bio21-exam-best-v2') ?? 0); } catch { return 0; } });

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch { /* storage may be unavailable */ } }, [records]);

  useEffect(() => {
    if (!examQuestions.length || examSubmitted || examSeconds <= 0) return;
    const timer = window.setInterval(() => setExamSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [examQuestions.length, examSubmitted, examSeconds > 0]);

  useEffect(() => {
    if (!examQuestions.length || examSeconds !== 0 || examSubmitted) return;
    setExamSubmitted(true);
    const score = Math.round((examScore / examQuestions.length) * 100);
    if (score > bestExamScore) { setBestExamScore(score); try { localStorage.setItem('bio21-exam-best-v2', String(score)); } catch { /* storage may be unavailable */ } }
    setRecords((previous) => { const next = { ...previous }; examQuestions.forEach((question) => { const answered = examAnswers[question.id]; if (answered !== undefined) next[question.id] = { correct: answered === question.answer, attempts: (previous[question.id]?.attempts ?? 0) + 1 }; }); return next; });
  }, [examSeconds, examQuestions, examSubmitted, examAnswers, examScore, bestExamScore]);

  const filtered = useMemo(() => {
    const list = questions.filter((question) => {
      const course = courses[question.day - 1];
      const record = records[question.id];
      return (phase === '全部阶段' || course.phase === phase)
        && (level === '全部难度' || question.level === level)
        && (mode === 'all' || (mode === 'wrong' && record?.correct === false) || (mode === 'unanswered' && !record));
    });
    if (shuffleKey === 0) return list;
    return [...list].sort((a, b) => (a.id.charCodeAt(a.id.length - 1) + shuffleKey * 7) % 17 - (b.id.charCodeAt(b.id.length - 1) + shuffleKey * 7) % 17);
  }, [phase, level, mode, records, shuffleKey]);

  const current = filtered.find((question) => question.id === activeId) ?? filtered[0];
  const answeredCount = Object.keys(records).filter((id) => questions.some((question) => question.id === id)).length;
  const correctCount = Object.values(records).filter((record) => record.correct).length;
  const wrongCount = Object.values(records).filter((record) => !record.correct).length;
  const attempts = Object.values(records).reduce((sum, record) => sum + record.attempts, 0);

  function startExam() {
    const pool = [...questions].sort(() => Math.random() - 0.5).slice(0, 20);
    setExamQuestions(pool); setExamAnswers({}); setExamSubmitted(false); setExamSeconds(15 * 60);
  }
  const examScore = examQuestions.reduce((score, question) => score + (examAnswers[question.id] === question.answer ? 1 : 0), 0);
  function finishExam() {
    if (!examSubmitted && !window.confirm('确定交卷并查看成绩吗？未作答题目将按错误计分。')) return;
    setExamSubmitted(true);
    const score = Math.round((examScore / Math.max(1, examQuestions.length)) * 100);
    if (score > bestExamScore) { setBestExamScore(score); try { localStorage.setItem('bio21-exam-best-v2', String(score)); } catch { /* storage may be unavailable */ } }
    setRecords((previous) => { const next = { ...previous }; examQuestions.forEach((question) => { const answered = examAnswers[question.id]; if (answered !== undefined) next[question.id] = { correct: answered === question.answer, attempts: (previous[question.id]?.attempts ?? 0) + 1 }; }); return next; });
  }
  function selectMode(nextMode: typeof mode) { setMode(nextMode); setChoice(null); setRevealed(false); setActiveId(''); }
  function submit() {
    if (!current || choice === null || revealed) return;
    const correct = choice === current.answer;
    setRecords((previous) => ({ ...previous, [current.id]: { correct, attempts: (previous[current.id]?.attempts ?? 0) + 1 } }));
    setRevealed(true);
  }
  function move(delta: number) {
    if (!current || filtered.length === 0) return;
    const index = filtered.findIndex((question) => question.id === current.id);
    const next = filtered[(index + delta + filtered.length) % filtered.length];
    setActiveId(next.id); setChoice(null); setRevealed(false);
  }
  function resetBank() {
    if (window.confirm('确定清除本设备的题库作答记录吗？课程完成进度不会受影响。')) setRecords({});
    setChoice(null); setRevealed(false);
  }

  if (examQuestions.length > 0) return <section className="page-section practice-page">
    <div className="page-heading"><div><div className="eyebrow">BIO21 MOCK EXAM</div><h1>21 天综合测评</h1><p>随机抽取 20 道题，限时 15 分钟。交卷后查看得分、逐题解析并将作答结果纳入复习记录。</p></div><div className="heading-stat"><strong>{examSubmitted ? `${Math.round(examScore / examQuestions.length * 100)}` : `${Math.floor(examSeconds / 60)}:${String(examSeconds % 60).padStart(2, '0')}`}<small>{examSubmitted ? '分' : '剩余'}</small></strong><span>{examSubmitted ? `历史最佳 ${bestExamScore} 分` : `已答 ${Object.keys(examAnswers).length} / ${examQuestions.length}`}</span></div></div>
    {examSubmitted && <div className={`practice-explanation ${examScore / examQuestions.length >= 0.8 ? 'good' : 'bad'}`}><strong>测评完成：{examScore} / {examQuestions.length}（{Math.round(examScore / examQuestions.length * 100)} 分）</strong><p>{examScore / examQuestions.length >= 0.8 ? '掌握情况良好。建议继续挑战进阶题，并复习尚未答对的知识点。' : '建议查看下方解析，再进入错题复习模式巩固薄弱知识点。'}</p></div>}
    <div className="exam-question-list">{examQuestions.map((question, index) => <article className="practice-question-card exam-question" key={question.id}><div className="practice-question-meta"><span className="lesson-day">第 {index + 1} 题</span><span>DAY {String(question.day).padStart(2, '0')}</span><span className={`practice-level ${question.level === '进阶' ? 'advanced' : ''}`}>{question.level}</span>{examSubmitted && <span>{examAnswers[question.id] === question.answer ? '✓ 正确' : '需复习'}</span>}</div><h2>{question.prompt}</h2><div className="practice-options">{question.options.map((option, optionIndex) => <button key={option} disabled={examSubmitted} className={`practice-option ${examAnswers[question.id] === optionIndex ? 'chosen' : ''} ${examSubmitted && optionIndex === question.answer ? 'correct' : ''} ${examSubmitted && examAnswers[question.id] === optionIndex && optionIndex !== question.answer ? 'incorrect' : ''}`} onClick={() => setExamAnswers((previous) => ({ ...previous, [question.id]: optionIndex }))}><span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option}</strong><i>{examSubmitted && optionIndex === question.answer ? '✓' : ''}</i></button>)}</div>{examSubmitted && <div className="practice-explanation"><p>{question.explanation}</p><button className="text-button" onClick={() => openCourse(question.day)}>阅读 Day {question.day} 教材 →</button></div>}</article>)}</div>
    <div className="practice-actions exam-actions"><button className="button-secondary" onClick={() => { setExamQuestions([]); setExamAnswers({}); setExamSubmitted(false); }}>返回题库</button>{!examSubmitted ? <button className="button-primary" onClick={finishExam}>交卷并查看成绩 →</button> : <button className="button-primary" onClick={startExam}>再考一次 ↻</button>}</div>
  </section>;

  return <section className="page-section practice-page">
    <div className="page-heading"><div><div className="eyebrow">BIO21 PRACTICE BANK</div><h1>章节题库与错题复习</h1><p>按课程阶段和难度筛选题目；提交后查看解析，错题会进入复习队列。</p></div><div className="heading-stat"><strong>{questions.length}<small>题</small></strong><span>题库总量</span></div></div>
    <div className="exam-launch-row"><div><strong>21 天综合测评</strong><p>随机抽取 20 道题 · 限时 15 分钟 · 自动评分与逐题解析</p></div><div className="exam-best-score">历史最佳 <strong>{bestExamScore}</strong> 分</div><button className="button-primary" onClick={startExam}>开始测评 →</button></div>
    <div className="practice-metrics"><div><span>已作答题目</span><strong>{answeredCount}<small> / {questions.length}</small></strong></div><div><span>正确题目</span><strong>{correctCount}</strong></div><div><span>待复习错题</span><strong>{wrongCount}</strong></div><div><span>累计答题次数</span><strong>{attempts}</strong></div></div>
    <div className="practice-toolbar"><label><span>课程阶段</span><select value={phase} onChange={(event) => { setPhase(event.target.value); setActiveId(''); setChoice(null); setRevealed(false); }}>{phases.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>题目难度</span><select value={level} onChange={(event) => { setLevel(event.target.value as typeof level); setActiveId(''); setChoice(null); setRevealed(false); }}><option>全部难度</option><option>基础</option><option>进阶</option></select></label><div className="practice-modes"><button className={mode === 'all' ? 'active' : ''} onClick={() => selectMode('all')}>全部题目</button><button className={mode === 'unanswered' ? 'active' : ''} onClick={() => selectMode('unanswered')}>未作答</button><button className={mode === 'wrong' ? 'active' : ''} onClick={() => selectMode('wrong')}>错题复习</button></div></div>
    {!current ? <div className="empty-state practice-empty"><strong>当前筛选下没有题目</strong><p>{mode === 'wrong' ? '太好了，当前筛选条件下没有待复习错题。' : '试试切换课程阶段、难度或题目范围。'}</p><button className="button-secondary" onClick={() => { setPhase('全部阶段'); setLevel('全部难度'); selectMode('all'); }}>显示全部题目</button></div> : <article className="practice-question-card">
      <div className="practice-question-meta"><span className="lesson-day">DAY {String(current.day).padStart(2, '0')}</span><span>{courses[current.day - 1].phase}</span><span className={`practice-level ${current.level === '进阶' ? 'advanced' : ''}`}>{current.level}</span><span className="practice-question-count">{filtered.findIndex((question) => question.id === current.id) + 1} / {filtered.length}</span></div>
      <h2>{current.prompt}</h2><div className="practice-options">{current.options.map((option, index) => <button key={option} disabled={revealed} className={`practice-option ${choice === index ? 'chosen' : ''} ${revealed && index === current.answer ? 'correct' : ''} ${revealed && index === choice && index !== current.answer ? 'incorrect' : ''}`} onClick={() => setChoice(index)}><span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong><i>{revealed && index === current.answer ? '✓' : revealed && index === choice ? '×' : ''}</i></button>)}</div>
      {revealed && <div className={`practice-explanation ${choice === current.answer ? 'good' : 'bad'}`}><strong>{choice === current.answer ? '回答正确' : '需要复习'}</strong><p>{current.explanation}</p><button className="text-button" onClick={() => openCourse(current.day)}>阅读 Day {current.day} 教材 →</button></div>}
      <div className="practice-actions"><button className="button-secondary" onClick={() => move(-1)} disabled={filtered.length < 2}>← 上一题</button>{!revealed ? <button className="button-primary" onClick={submit} disabled={choice === null}>提交答案 →</button> : <button className="button-primary" onClick={() => move(1)} disabled={filtered.length < 2}>下一题 →</button>}</div>
    </article>}
    <div className="practice-bottom"><div><strong>复习建议</strong><p>先完成基础题，再使用“错题复习”筛选重新检查概念。题目结果保存在当前浏览器，不会上传到服务器。</p></div><div className="practice-bottom-actions"><button className="button-secondary" onClick={() => { setShuffleKey((key) => key + 1); setActiveId(''); setChoice(null); setRevealed(false); }}>调整题目顺序 ↻</button><button className="text-button" onClick={resetBank}>清除题库记录</button></div></div>
  </section>;
}
