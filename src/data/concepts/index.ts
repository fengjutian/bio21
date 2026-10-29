import type { ConceptEntry, ConceptGroup } from './types';
import { conceptPlan } from './plan';
import { coreConcepts } from './core';
import { alignedConcepts } from './aligned';
import { lifeConcepts } from './life';
import { molecularConcepts } from './molecular';
import { geneticsConcepts } from './genetics';
import { experimentConcepts } from './experiment';
import { bioinformaticsConcepts } from './bioinformatics';
import { biomanufacturingConcepts } from './biomanufacturing';
import { synbioConcepts } from './synbio';

export type { ConceptEntry, ConceptGroup };
export { conceptPlan };

/** 全部概念条目。术语名全局唯一。 */
export const conceptLibrary: ConceptEntry[] = [
  ...coreConcepts,
  ...alignedConcepts,
  ...lifeConcepts,
  ...molecularConcepts,
  ...geneticsConcepts,
  ...experimentConcepts,
  ...bioinformaticsConcepts,
  ...biomanufacturingConcepts,
  ...synbioConcepts,
];

const byTerm = new Map(conceptLibrary.map(item => [item.term, item]));

/** 按术语名查询概念；不存在时返回 undefined。 */
export function findConcept(term: string): ConceptEntry | undefined {
  return byTerm.get(term);
}

/** 按分组归拢概念，分组顺序固定，便于 UI 稳定展示。 */
export const conceptGroups: ConceptGroup[] = [
  '生命基础',
  '细胞生物学',
  '分子生物学',
  '遗传学',
  '实验技术',
  '生物信息学',
  '生物制造',
  '合成生物学',
  '诊断与医学',
  '安全与伦理',
];

export const conceptsByGroup: Record<ConceptGroup, ConceptEntry[]> = conceptGroups.reduce((acc, group) => {
  acc[group] = conceptLibrary.filter(item => item.group === group);
  return acc;
}, {} as Record<ConceptGroup, ConceptEntry[]>);

/** 概念 → 关联章节号（去重、升序）。 */
export const conceptChapters = conceptLibrary.reduce<Record<number, string[]>>((acc, item) => {
  (acc[item.chapter] ??= []).push(item.term);
  return acc;
}, {});

export const relatedConcepts = (term: string): ConceptEntry[] => {
  const entry = byTerm.get(term);
  if (!entry) return [];
  return entry.related.map(name => byTerm.get(name)).filter((item): item is ConceptEntry => Boolean(item));
};
