import { useEffect, useMemo, useState } from 'react';
import { textbook } from '../data/textbook';
import { courses } from '../data/courses';
import { deeperQuestions } from '../data/questionBank';

type ExplorerTab = 'graph' | 'diagnosis' | 'prereq' | 'animation' | 'sources';
type Topic = { id:string; name:string; group:string; desc:string; links:string[] };
const topics:Topic[] = [
 {id:'dna',name:'DNA 结构',group:'遗传信息',desc:'DNA 通常由两条反向平行的多核苷酸链构成；A–T、G–C 的互补配对使序列能够被复制。',links:['replication','rna','pcr','sanger']},
 {id:'replication',name:'DNA 复制',group:'分子机制',desc:'复制机器以亲代 DNA 链为模板合成新链。DNA 聚合酶通常沿新链 5′→3′ 方向延伸，并需要引物提供可延伸的 3′-OH。',links:['dna','polymerase','cell']},
 {id:'rna',name:'RNA 转录',group:'遗传信息',desc:'RNA 聚合酶读取 DNA 模板链并合成 RNA；RNA 的序列与编码链相近，但通常以 U 替代 T。',links:['dna','protein','cell']},
 {id:'protein',name:'蛋白质翻译',group:'细胞功能',desc:'核糖体读取 mRNA 密码子，tRNA 递送相应氨基酸，形成多肽；折叠和修饰进一步影响功能。',links:['rna','metabolism','cell']},
 {id:'cell',name:'细胞与调控',group:'生命系统',desc:'细胞将遗传信息、代谢反应、膜运输和调控网络整合为动态系统。基因表达会受环境和细胞状态影响。',links:['replication','rna','protein','metabolism','fermentation']},
 {id:'metabolism',name:'代谢与酶',group:'生命系统',desc:'酶催化代谢反应，代谢网络转化物质与能量；酶活性会受温度、pH、底物和调控等因素影响。',links:['protein','cell','fermentation']},
 {id:'polymerase',name:'DNA 聚合酶',group:'分子工具',desc:'DNA 聚合酶催化核苷酸加入新生 DNA 链。不同聚合酶的耐热性、保真度、过程性和校对能力存在差异。',links:['replication','pcr','sanger']},
 {id:'pcr',name:'PCR 扩增',group:'实验技术',desc:'引物界定目标区域，循环中的变性、退火和延伸使目标片段扩增。实际扩增效率并非始终为 100%。',links:['dna','polymerase','sanger']},
 {id:'sanger',name:'Sanger 测序',group:'实验技术',desc:'测序反应中掺入荧光标记的双脱氧核苷酸会终止延伸；毛细管电泳按片段长度分离，再读取荧光信号。',links:['dna','polymerase','pcr']},
 {id:'fermentation',name:'发酵与生物反应器',group:'工程应用',desc:'细胞或微生物在受控环境中转化底物并生成目标产物。放大时还需考虑传质、混合、热量移除和过程控制。',links:['cell','metabolism','protein']},
];
const topicById = Object.fromEntries(topics.map(t=>[t.id,t])) as Record<string,Topic>;

type RelationType = 'prerequisite' | 'mechanism' | 'application';
type Dependency = { from: string; to: string; type: RelationType; reason: string };
const dependencies: Dependency[] = [
 {from:'dna',to:'replication',type:'prerequisite',reason:'复制以亲代 DNA 链作为模板；理解碱基配对和链方向才能理解新链如何合成。'},
 {from:'dna',to:'rna',type:'prerequisite',reason:'转录需要识别 DNA 模板链，并依据互补配对规则合成 RNA。'},
 {from:'rna',to:'protein',type:'mechanism',reason:'mRNA 提供密码子序列，核糖体和 tRNA 将序列信息转化为多肽。'},
 {from:'protein',to:'metabolism',type:'mechanism',reason:'许多代谢反应由酶催化，而酶通常是具有特定结构的蛋白质。'},
 {from:'cell',to:'replication',type:'mechanism',reason:'DNA 复制发生在细胞的遗传物质维护与传递体系中，具体时序取决于生物类型。'},
 {from:'cell',to:'rna',type:'mechanism',reason:'转录由细胞内的分子机器完成，并受到细胞状态和调控网络影响。'},
 {from:'cell',to:'metabolism',type:'mechanism',reason:'细胞通过代谢获取和分配物质与能量，以支持生长、维持和调控。'},
 {from:'metabolism',to:'fermentation',type:'application',reason:'发酵把细胞代谢转化为可控制的生产过程，需同时观察底物、细胞状态和产物。'},
 {from:'cell',to:'fermentation',type:'application',reason:'宿主细胞或微生物的生理状态会影响生长、产物形成和过程稳定性。'},
 {from:'dna',to:'pcr',type:'prerequisite',reason:'PCR 的模板、目标区域和引物设计都依赖 DNA 序列及其方向信息。'},
 {from:'polymerase',to:'pcr',type:'prerequisite',reason:'DNA 聚合酶从引物的 3′-OH 端延伸，是 PCR 延伸阶段的核心催化工具。'},
 {from:'dna',to:'polymerase',type:'prerequisite',reason:'只有理解模板链和新链的方向，才能解释聚合酶的读取与合成方向。'},
 {from:'polymerase',to:'replication',type:'mechanism',reason:'细胞复制依赖聚合酶及其他复制蛋白协同完成 DNA 链延伸。'},
 {from:'pcr',to:'sanger',type:'application',reason:'PCR 可用于获得测序模板，但 Sanger 也可使用其他合适来源的 DNA 模板。'},
 {from:'polymerase',to:'sanger',type:'mechanism',reason:'测序聚合酶延伸时掺入 ddNTP 会导致链终止，产生不同长度片段。'},
 {from:'protein',to:'fermentation',type:'application',reason:'若目标产物是重组蛋白，表达、折叠、降解和细胞生理状态都会影响产物质量。'},
 {from:'rna',to:'cell',type:'mechanism',reason:'转录产物参与基因表达与多种细胞过程；反过来，细胞状态也调节转录。'},
 {from:'metabolism',to:'cell',type:'mechanism',reason:'代谢提供细胞活动所需的物质和能量，代谢状态也会反馈影响细胞调控。'},
];
const nodeMeta: Record<string,{day:number;sourceIndexes:number[];questionDays:number[]}> = {
 dna:{day:4,sourceIndexes:[0,4],questionDays:[4]}, replication:{day:5,sourceIndexes:[2],questionDays:[5]}, rna:{day:5,sourceIndexes:[1],questionDays:[5,6]}, protein:{day:3,sourceIndexes:[1],questionDays:[3,5]}, cell:{day:2,sourceIndexes:[0],questionDays:[2]}, metabolism:{day:3,sourceIndexes:[0],questionDays:[3,13]}, polymerase:{day:9,sourceIndexes:[2,4],questionDays:[9]}, pcr:{day:9,sourceIndexes:[4],questionDays:[9]}, sanger:{day:10,sourceIndexes:[3],questionDays:[10]}, fermentation:{day:13,sourceIndexes:[0],questionDays:[13,14]}
};
const relationLabels: Record<RelationType,string> = {prerequisite:'前置依赖',mechanism:'机制关联',application:'应用延伸'};

// Explicit concept-to-question mapping. IDs match QuestionBank's core-day/deep-day IDs.
const conceptQuestionMap: Record<string,string[]> = {
 dna:['core-4','deep-4'], replication:['core-5','deep-5'], rna:['core-5','deep-5','core-6','deep-6'],
 protein:['core-3','deep-3','core-5','deep-5'], cell:['core-2','deep-2'], metabolism:['core-3','deep-3','core-13','deep-13'],
 polymerase:['core-9','deep-9'], pcr:['core-9','deep-9'], sanger:['core-10','deep-10'], fermentation:['core-13','deep-13','core-14','deep-14']
};
const animations = [
 {id:'replication',title:'DNA 复制',subtitle:'半保留复制的概念模型',steps:[['起始与解链','复制起点附近的 DNA 双链被打开，形成可供复制机器使用的模板。','双链打开'],['引物建立','引物酶合成短 RNA 引物，为 DNA 聚合酶提供可延伸的 3′-OH 端。','引物就位'],['链延伸','DNA 聚合酶沿模板链读取信息，并以 5′→3′ 方向合成新 DNA。领先链和滞后链的合成方式不同。','新链延伸'],['校对与收尾','部分 DNA 聚合酶具有校对能力，细胞还会使用其他修复机制降低错误；最终形成两份 DNA。','两份 DNA']]},
 {id:'transcription',title:'转录与翻译',subtitle:'遗传信息如何转化为蛋白质',steps:[['DNA 模板开放','局部 DNA 区域开放，转录因子和 RNA 聚合酶等因系统而异的组分参与起始。','转录启动'],['RNA 合成','RNA 聚合酶读取 DNA 模板链，合成互补 RNA；真核 mRNA 通常还需加工。','RNA 生成'],['核糖体读取','核糖体按 mRNA 密码子推进，tRNA 将对应氨基酸带到核糖体。','密码子读取'],['多肽形成与折叠','氨基酸通过肽键连接形成多肽，随后折叠并可能经历修饰；并非所有 RNA 都编码蛋白质。','蛋白质形成']]},
 {id:'pcr',title:'PCR 三阶段',subtitle:'变性、退火、延伸的循环过程',steps:[['变性','加热使双链 DNA 分开。具体温度与时间取决于模板、缓冲液和酶体系。','双链分开'],['退火','降温后引物与互补的目标序列结合。引物设计和退火条件影响特异性。','引物结合'],['延伸','耐热 DNA 聚合酶从引物 3′ 端延伸新链，使用 dNTP 作为原料。','新链合成'],['重复循环','多个循环使目标区域累积；实际扩增受效率、试剂消耗和副产物等因素影响。','目标片段累积']]},
 {id:'sanger',title:'Sanger 测序',subtitle:'链终止、片段分离与荧光读序',steps:[['测序反应','模板、引物、DNA 聚合酶、普通 dNTP 和荧光标记 ddNTP 共同参与链合成。','测序链开始'],['随机终止','当 ddNTP 被掺入时，由于缺少可继续延伸所需的 3′-OH，链延伸终止，形成不同长度片段。','不同长度片段'],['毛细管电泳','片段在毛细管聚合物中按长度分离，较短片段通常先到达检测窗口。','片段分离'],['荧光与判读','检测各片段末端的荧光信号，形成电泳图；需检查峰形、背景和质量值，不能只凭自动碱基调用。','色谱峰与序列']]},
 {id:'fermentation',title:'发酵过程',subtitle:'从细胞生长到目标产物',steps:[['接种与适应','将合适状态的种子培养物引入受控反应器，细胞开始适应培养环境。','细胞适应'],['生长与底物转化','细胞利用底物生长或维持代谢，并可能生成目标产物；产物形成与生长的关系取决于具体系统。','底物被利用'],['过程监测与控制','温度、pH、溶氧、搅拌和补料等参数相互影响，需要依据过程数据进行控制。','参数联动'],['收获与质量评估','收获细胞或培养液中的产物，再进行分离纯化和质量分析；高滴度不必然意味着高产率或低成本。','产物与检测']]},
];
const sources = [
 {title:'Molecular Biology of the Cell：The Structure and Function of DNA',org:'NCBI Bookshelf · Alberts 等',url:'https://www.ncbi.nlm.nih.gov/books/NBK26821/',use:'DNA 双螺旋、互补碱基配对、反向平行与遗传信息存储。'},
 {title:'Molecular Biology of the Cell：How Cells Read the Genome',org:'NCBI Bookshelf · Alberts 等',url:'https://www.ncbi.nlm.nih.gov/books/NBK21050/',use:'DNA → RNA → 蛋白质、转录与翻译，以及 RNA 加工。'},
 {title:'DNA Replication Mechanisms',org:'NCBI Bookshelf',url:'https://www.ncbi.nlm.nih.gov/books/NBK21054/',use:'DNA 聚合酶、引物、复制叉、校对和复制机制。'},
 {title:'Sanger DNA Sequencing Workflow',org:'Thermo Fisher Scientific',url:'https://www.thermofisher.com/us/en/home/life-science/sequencing/sanger-sequencing/sanger-dna-sequencing-workflow.html',use:'Sanger 测序流程、循环测序、毛细管电泳与电泳图分析。'},
 {title:'Genomes：Studying DNA',org:'NCBI Bookshelf',url:'https://www.ncbi.nlm.nih.gov/books/NBK21129/',use:'PCR、DNA 研究方法、酶工具与技术限制。'},
];
const prerequisite = [
 {id:'dna',title:'DNA 结构',detail:'理解核苷酸、双链、5′/3′ 方向和互补碱基配对。',check:'能写出 ATGC 序列的互补链，并标注链方向。'},
 {id:'pair',title:'互补配对与引物',detail:'理解引物需与目标模板区域互补，两个引物决定主要扩增边界。',check:'能解释引物为什么需要特异性，及错配可能造成什么影响。'},
 {id:'enzyme',title:'DNA 聚合酶',detail:'理解聚合酶从引物的 3′-OH 端延伸，并沿新链 5′→3′ 合成。',check:'能区分模板读取方向与新链合成方向。'},
 {id:'pcr',title:'PCR 三阶段',detail:'理解变性、退火、延伸的目的，以及循环重复如何累积目标片段。',check:'能解释温度、引物设计和聚合酶为何影响扩增结果。'},
 {id:'controls',title:'结果判读与对照',detail:'理解阳性/阴性对照、污染风险、非特异扩增及产物验证。',check:'知道“出现条带”并不单独证明序列身份正确。'},
];

export default function ScienceExplorer({openCourse,openQuestionBank}:{openCourse:(day:number)=>void;openQuestionBank?:()=>void}) {
 const [tab,setTab] = useState<ExplorerTab>('graph');
 const [selectedTopic,setSelectedTopic] = useState('dna');
 const [animationId,setAnimationId] = useState('pcr');
 const [step,setStep] = useState(0);
 const [playing,setPlaying] = useState(false);
 const [checked,setChecked] = useState<string[]>([]);
 const animation = animations.find(a=>a.id===animationId) ?? animations[0];
 useEffect(()=>{ if(!playing)return; const timer=window.setInterval(()=>setStep(s=>{if(s>=animation.steps.length-1){setPlaying(false);return s;}return s+1;}),2200);return ()=>window.clearInterval(timer);},[playing,animationId,animation.steps.length]);
 useEffect(()=>{setStep(0);setPlaying(false);},[animationId]);
 const current = topicById[selectedTopic];
 const [questionRecords, setQuestionRecords] = useState<Record<string,{correct:boolean;attempts:number}>>(() => {
  try { const raw=JSON.parse(localStorage.getItem('bio21-question-bank-v1') ?? '{}'); return raw && typeof raw==='object' ? raw : {}; } catch { return {}; }
 });
 useEffect(() => { const refresh=()=>{try{const raw=JSON.parse(localStorage.getItem('bio21-question-bank-v1') ?? '{}');setQuestionRecords(raw&&typeof raw==='object'?raw:{});}catch{setQuestionRecords({});}}; window.addEventListener('focus',refresh); return ()=>window.removeEventListener('focus',refresh); },[]);
 const incoming = useMemo(()=>dependencies.filter(edge=>edge.to===selectedTopic),[selectedTopic]);
 const outgoing = useMemo(()=>dependencies.filter(edge=>edge.from===selectedTopic),[selectedTopic]);
 const meta = nodeMeta[selectedTopic];
 const mappedQuestions = useMemo(()=>{
  if(!meta)return [];
  return meta.questionDays.flatMap(day=>[
   {id:`core-${day}`,prompt:courses[day-1]?.quiz.question ?? '',level:'基础'},
   ...deeperQuestions.filter(q=>q.day===day).map(q=>({id:`deep-${day}`,prompt:q.prompt,level:'进阶'}))
  ]).filter(q=>q.prompt);
 },[meta]);
 const weakCount = Object.values(questionRecords).filter(r=>r && r.correct===false).length;
 function isNodeWeak(topicId:string) { const node=nodeMeta[topicId]; return Boolean(node && node.questionDays.some(day=>questionRecords[`core-${day}`]?.correct===false || questionRecords[`deep-${day}`]?.correct===false)); }
 const selectedQuestionStates = (conceptQuestionMap[selectedTopic] ?? []).map(id=>questionRecords[id]);
 const nodeStatus = selectedQuestionStates.some(r=>r?.correct===false)?'薄弱待复习':selectedQuestionStates.some(r=>r?.correct===true)?'已有答题记录':'尚未测评';
 return <section className="page-section science-page">
  <div className="page-heading"><div><div className="eyebrow">BIOLOGY KNOWLEDGE SYSTEM · V2.5</div><h1>生物知识探索</h1><p>把知识依赖、概念诊断、机制过程和参考证据连接成可执行的学习闭环。</p></div><div className="heading-stat"><strong>{topics.length}<small> 个节点</small></strong><span>可追踪的知识依赖</span></div></div>
  <div className="science-tabs" role="tablist" aria-label="生物知识探索分区">{([{id:'graph',label:'知识依赖网络'},{id:'diagnosis',label:'概念级诊断'},{id:'prereq',label:'前置知识链'},{id:'animation',label:'机制动画'},{id:'sources',label:'证据与来源'}] as {id:ExplorerTab;label:string}[]).map(t=><button key={t.id} role="tab" aria-selected={tab===t.id} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.label}</button>)}</div>
  {tab==='graph'&&<div className="dependency-workspace">
   <section className="science-panel dependency-network-panel">
    <div className="science-panel-head"><div><span className="eyebrow">DIRECTED KNOWLEDGE NETWORK</span><h2>知识依赖网络</h2><p>箭头表示学习依赖、机制联系或应用延伸。选择节点，追踪“先学什么、由此理解什么、应用到哪里”。</p></div><div className="dependency-summary"><strong>{topics.length}</strong><span>知识节点</span><strong>{dependencies.length}</strong><span>条有向关系</span></div></div>
    <div className="dependency-legend"><span><i className="dep-dot prereq-dot"/>前置依赖</span><span><i className="dep-dot mechanism-dot"/>机制关联</span><span><i className="dep-dot application-dot"/>应用延伸</span></div>
    <div className="dependency-lanes">
     {['遗传信息','分子机制','细胞功能','生命系统','分子工具','实验技术','工程应用'].map(group=>{const groupTopics=topics.filter(t=>t.group===group);return groupTopics.length?<div className="dependency-lane" key={group}><div className="dependency-lane-label">{group}</div><div className="dependency-lane-nodes">{groupTopics.map(t=><button key={t.id} className={`dependency-node ${selectedTopic===t.id?'selected':''} ${isNodeWeak(t.id)?'has-weakness':''}`} onClick={()=>setSelectedTopic(t.id)}><span>{t.name}</span><small>{nodeMeta[t.id]?.day ? `第 ${nodeMeta[t.id].day} 章` : t.group}</small></button>)}</div></div>:null;})}
    </div>
    <div className="dependency-edge-list"><h3>与当前选择相关的有向关系</h3>{[...incoming.map(e=>({...e,direction:'前置来源'})),...outgoing.map(e=>({...e,direction:'后续目标'}))].length===0&&<p>当前节点暂未配置关系。</p>}{[...incoming.map(e=>({...e,direction:'前置来源'})),...outgoing.map(e=>({...e,direction:'后续目标'}))].map((edge,i)=><button className="dependency-edge" key={`${edge.from}-${edge.to}-${i}`} onClick={()=>setSelectedTopic(edge.direction==='前置来源'?edge.from:edge.to)}><span className={`dependency-edge-type ${edge.type}`}>{relationLabels[edge.type]}</span><span className="dependency-edge-path">{topicById[edge.from].name}<b>→</b>{topicById[edge.to].name}</span><small>{edge.reason}</small><em>{edge.direction==='前置来源'?'查看前置节点 ↗':'查看后续节点 ↗'}</em></button>)}</div>
   </section>
   <aside className="science-panel dependency-detail-panel"><span className="science-kicker">KNOWLEDGE NODE · {nodeStatus}</span><h2>{current.name}</h2><p className="dependency-definition">{current.desc}</p><div className="dependency-detail-actions"><button className="button-primary" onClick={()=>openCourse(meta?.day ?? 1)}>打开教材章节 <span>→</span></button><span>第 {meta?.day ?? '—'} 章</span></div>
    <section className="dependency-evidence"><h3>教材段落</h3><strong>{textbook[meta?.day ?? 1].heading}</strong><p>{textbook[meta?.day ?? 1].reading}</p><button onClick={()=>openCourse(meta?.day ?? 1)}>阅读完整章节 ↗</button></section>
    <section className="dependency-evidence"><h3>对应题目与掌握情况</h3><p className="dependency-small-note">错题总数：{weakCount} 道（基于本机章节题库最近一次作答记录）</p>{mappedQuestions.map(q=>{const record=questionRecords[q.id];return <article className="dependency-question" key={q.id}><div><span>{q.level}</span><b className={record?(record.correct?'question-mastered':'question-weak'):(record?.attempts?'question-weak':'question-new')}>{!record?'未作答':record.correct?'最近答对':'最近答错'}</b></div><p>{q.prompt}</p><button onClick={()=>openQuestionBank ? openQuestionBank() : openCourse(Number(q.id.split('-')[1]) || meta?.day || 1)}>进入章节题库 ↗</button></article>})}</section>
    <section className="dependency-evidence"><h3>参考来源</h3>{(meta?.sourceIndexes ?? []).map(index=>sources[index]&&<a className="dependency-source" key={sources[index].url} href={sources[index].url} target="_blank" rel="noreferrer"><strong>{sources[index].title}</strong><small>{sources[index].org}</small><span>{sources[index].use}</span></a>)}</section>
    <div className="science-caution">掌握度规则：最近一次答错会标记为“薄弱待复习”；最近一次答对只表示有正向记录，不等于已稳定掌握。教材段落和题目按当前课程映射，建议结合完整上下文判断。</div>
   </aside>
  </div>}
  {tab==='diagnosis'&&<div className="science-panel concept-diagnosis-panel">
   <div className="science-panel-head"><div><span className="eyebrow">CONCEPT-LEVEL DIAGNOSTICS</span><h2>概念级掌握诊断</h2><p>将题目显式映射到知识点，并结合最近一次作答和累计尝试次数，区分未测、待复习和已有正向证据。结果只反映本机记录，不等同于经过验证的能力测量。</p></div><span className="science-count">{topics.length} 个概念</span></div>
   <div className="diagnosis-summary-grid"><div><strong>{topics.filter(t=>(conceptQuestionMap[t.id]??[]).some(id=>questionRecords[id]?.correct===false)).length}</strong><span>有最近错题</span></div><div><strong>{topics.filter(t=>(conceptQuestionMap[t.id]??[]).length>0&&(conceptQuestionMap[t.id]??[]).every(id=>questionRecords[id]?.correct===true)).length}</strong><span>映射题目最近均答对</span></div><div><strong>{topics.filter(t=>(conceptQuestionMap[t.id]??[]).every(id=>!questionRecords[id])).length}</strong><span>尚无作答记录</span></div></div>
   <div className="concept-diagnosis-list">{topics.map(topic=>{
    const ids=conceptQuestionMap[topic.id]??[]; const records=ids.map(id=>questionRecords[id]); const hasWrong=records.some(r=>r?.correct===false); const answered=records.filter(Boolean).length; const allCorrect=records.length>0&&records.every(r=>r?.correct===true); const repeatCorrect=allCorrect&&records.every(r=>(r?.attempts??0)>=2); const status=hasWrong?'需要复习':answered===0?'尚未测评':allCorrect?'最近映射题均答对':'部分已测';
    const prereqEdges=dependencies.filter(e=>e.to===topic.id&&e.type==='prerequisite'); const missingPrereqs=prereqEdges.map(e=>topicById[e.from]).filter(t=>{const qids=conceptQuestionMap[t.id]??[];return qids.length===0||qids.some(id=>!questionRecords[id]||questionRecords[id].correct===false)});
    return <article key={topic.id} className={`concept-diagnosis-card ${hasWrong?'diagnosis-weak':''}`}><div className="concept-diagnosis-main"><div><span className="science-kicker">{topic.group}</span><h3>{topic.name}</h3><p>{topic.desc}</p></div><span className={`diagnosis-status ${hasWrong?'weak':allCorrect?'good':'neutral'}`}>{status}</span></div><div className="diagnosis-evidence-row"><span>关联题目：{ids.length} 道</span><span>已有记录：{answered}/{ids.length}</span>{repeatCorrect&&<span>多次作答均正确（初步信号）</span>}</div>{missingPrereqs.length>0&&<div className="diagnosis-prereq-warning"><strong>建议先检查前置知识：</strong>{missingPrereqs.map(t=>t.name).join('、')}</div>}{hasWrong&&<div className="diagnosis-next-step">建议：先复习教材段落，再重做对应题目；若前置知识也未掌握，按依赖顺序从上游开始。</div>}<div className="concept-diagnosis-actions"><button onClick={()=>{setSelectedTopic(topic.id);setTab('graph');}}>查看知识关系 ↗</button><button onClick={()=>openCourse(nodeMeta[topic.id]?.day??1)}>打开教材 ↗</button><button onClick={()=>openQuestionBank?openQuestionBank():openCourse(nodeMeta[topic.id]?.day??1)}>进入题库 ↗</button></div></article>;
   })}</div><div className="science-caution">诊断规则：最近一次答错只表示需要复习；最近映射题均答对也不能证明稳定掌握。当前题目映射是课程级的近似映射，后续应为每题增加更细的概念标签，并扩充同概念的不同题型。</div>
  </div>}
  {tab==='prereq'&&<div className="science-panel"><div className="science-panel-head"><div><span className="eyebrow">LEARNING PREREQUISITES</span><h2>进入 PCR 前的知识链</h2><p>按顺序检查理解情况。勾选仅保存在当前页面状态，不会替代课程考试成绩。</p></div><span className="science-count">{checked.length}/{prerequisite.length} 已自查</span></div><div className="prereq-list">{prerequisite.map((item,i)=><article key={item.id} className={`prereq-item ${checked.includes(item.id)?'checked':''}`}><div className="prereq-index">{checked.includes(item.id)?'✓':String(i+1).padStart(2,'0')}</div><div className="prereq-copy"><h3>{item.title}</h3><p>{item.detail}</p><div><strong>自查标准：</strong>{item.check}</div></div><label className="prereq-check"><input type="checkbox" checked={checked.includes(item.id)} onChange={e=>setChecked(prev=>e.target.checked?[...prev,item.id]:prev.filter(x=>x!==item.id))}/><span>我已理解</span></label></article>)}</div><div className="prereq-footer"><p>如果某一步还不确定，建议先复习 DNA 结构、聚合酶和实验对照，再学习 PCR 参数优化。</p><button className="button-primary" onClick={()=>openCourse(8)}>打开相关课程 <span>→</span></button></div></div>}
  {tab==='sources'&&<div className="science-panel"><div className="science-panel-head"><div><span className="eyebrow">EVIDENCE & REFERENCES</span><h2>关键结论的参考来源</h2><p>优先使用开放教材、专业数据库和技术提供方的流程说明。来源用于进一步核查，不等于本网站内容已通过同行评审。</p></div></div><div className="source-list">{sources.map((s,i)=><article className="source-item" key={s.url}><span className="source-index">{String(i+1).padStart(2,'0')}</span><div className="source-copy"><h3>{s.title}</h3><small>{s.org}</small><p>{s.use}</p><a href={s.url} target="_blank" rel="noreferrer">打开参考来源 ↗</a></div></article>)}</div><div className="science-caution">阅读建议：优先看教材中关于机制的章节，再核对技术流程资料。对临床诊断、具体实验条件和产品性能，应进一步查阅适用的原始研究、验证数据及官方说明。</div></div>}
 </section>;
}
