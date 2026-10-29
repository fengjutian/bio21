import { useEffect, useMemo, useState } from 'react';
import { Link2, BookOpen, Layers, Search, X } from 'lucide-react';
import { conceptLibrary, conceptGroups, findConcept } from '../data/concepts';
import type { ConceptEntry, ConceptGroup } from '../data/concepts';

/**
 * 概念浏览器。
 *
 * 设计取向：概念不是孤立词条。每一项都带机制、边界与关联，
 * 并能反向跳回对应课程章节，让术语与教材互相可达。
 */
export default function ConceptBrowser({ openCourse, focusTerm }: { openCourse: (day: number) => void; focusTerm?: string }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<ConceptGroup | '全部'>('全部');
  const [selected, setSelected] = useState<ConceptEntry | null>(null);

  // 外部请求聚焦某个概念时（来自知识网络等入口），切换分组并定位到该条目。
  useEffect(() => {
    if (!focusTerm) return;
    const found = findConcept(focusTerm);
    if (!found) return;
    setGroup('全部');
    setQuery('');
    setSelected(found);
    const timer = window.setTimeout(() => {
      document.getElementById(`concept-${found.term}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [focusTerm]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conceptLibrary.filter(item => {
      if (group !== '全部' && item.group !== group) return false;
      if (!q) return true;
      return [item.term, item.alias, item.summary, item.detail, item.misconception, item.group]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [query, group]);

  const groupCounts = useMemo(() => {
    const counts = {} as Record<string, number>;
    for (const item of conceptLibrary) counts[item.group] = (counts[item.group] ?? 0) + 1;
    return counts;
  }, []);

  function focusConcept(term: string) {
    const found = findConcept(term);
    if (!found) return;
    setGroup('全部');
    setQuery('');
    setSelected(found);
    window.requestAnimationFrame(() => {
      document.getElementById(`concept-${found.term}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /** 反向关系：哪些概念把当前概念列为相关概念。 */
  const backlinks = useMemo(() => {
    if (!selected) return [];
    return conceptLibrary.filter(item => item.term !== selected.term && item.related.includes(selected.term));
  }, [selected]);

  return (
    <section className="page-section concept-browser">
      <div className="page-heading">
        <div>
          <div className="eyebrow">BIOLOGY CONCEPT LIBRARY · V2.6</div>
          <h1>生物学概念库</h1>
          <p>
            每个概念都同时给出定义、机制、易错边界与关联概念，并标注对应的课程章节。
            从这里进入，可以按学科浏览，也可以顺着相关概念逐层展开。
          </p>
        </div>
        <div className="heading-stat">
          <strong>{conceptLibrary.length}</strong>
          <span>个概念 · {conceptGroups.length} 个学科</span>
        </div>
      </div>

      <div className="concept-toolbar">
        <label className="concept-search search-box">
          <span><Search size={14} /></span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索术语、英文名、机制说明或边界……"
            aria-label="搜索概念"
          />
          {query && (
            <button className="concept-search-clear" onClick={() => setQuery('')} aria-label="清除搜索">
              <X size={13} />
            </button>
          )}
        </label>
        <div className="concept-group-filter">
          <button className={group === '全部' ? 'active' : ''} onClick={() => setGroup('全部')}>
            全部 <b>{conceptLibrary.length}</b>
          </button>
          {conceptGroups.map(g => (
            <button key={g} className={group === g ? 'active' : ''} onClick={() => setGroup(g)}>
              {g} <b>{groupCounts[g] ?? 0}</b>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="concept-focus-panel" role="status">
          <div>
            <span className="eyebrow">FOCUS CONCEPT</span>
            <h3>{selected.term}</h3>
            <p>{selected.summary}</p>
            {backlinks.length > 0 && (
              <p className="concept-backlinks">
                被 {backlinks.length} 个概念引用：
                {backlinks.slice(0, 6).map(item => item.term).join('、')}
                {backlinks.length > 6 ? ' 等' : ''}
              </p>
            )}
          </div>
          <div className="concept-focus-actions">
            <button className="button-primary" onClick={() => openCourse(selected.chapter)}>
              第 {selected.chapter} 章教材 <BookOpen size={13} />
            </button>
            <button className="button-secondary" onClick={() => setSelected(null)}>
              关闭
            </button>
          </div>
        </div>
      )}

      {group === '全部' && !query && (
        <div className="concept-group-overview">
          {conceptGroups.map(g => (
            <button key={g} className="concept-group-card" onClick={() => setGroup(g)}>
              <span className="concept-group-icon"><Layers size={14} /></span>
              <strong>{g}</strong>
              <small>{groupCounts[g] ?? 0} 个概念</small>
            </button>
          ))}
        </div>
      )}

      <div className="concept-section-head">
        <h2>
          {group === '全部' ? '全部概念' : group}
          <span>{filtered.length}</span>
        </h2>
        <p>点击相关概念可在库内跳转，点击章节号可返回对应教材。</p>
      </div>

      <div className="concept-grid">
        {filtered.map(item => (
          <article
            className={`concept-card ${selected?.term === item.term ? 'is-focused' : ''}`}
            key={item.term}
            id={`concept-${item.term}`}
          >
            <div className="concept-card-top">
              <span className="concept-group-badge">{item.group}</span>
              <button
                className="concept-chapter-link"
                onClick={() => openCourse(item.chapter)}
                title={`打开第 ${item.chapter} 章教材`}
              >
                第 {item.chapter} 章
              </button>
            </div>
            <h3>{item.term}</h3>
            <span className="concept-alias">{item.alias}</span>
            <p className="concept-summary">{item.summary}</p>
            <p className="concept-detail">{item.detail}</p>
            <div className="concept-boundary">
              <span>易错点与边界</span>
              <p>{item.misconception}</p>
            </div>
            <div className="concept-related">
              <span className="concept-related-label"><Link2 size={11} />相关概念</span>
              <div className="concept-related-list">
                {item.related.map(name => (
                  <button key={name} onClick={() => focusConcept(name)}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          没有找到匹配概念。试试更短的关键词，或切换到其他学科分组。
        </div>
      )}

      <p className="library-disclaimer">
        概念库由教材正文、章节扩展材料与案例分析整合而成，用于建立学科词汇表与概念边界意识。
        全部内容仅用于概念学习，不提供替代机构 SOP 的实验参数、临床建议或可直接执行的操作方案。
      </p>
    </section>
  );
}
