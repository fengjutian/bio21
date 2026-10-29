/** 学科分组。概念库按此维度组织，UI 用它做筛选。 */
export type ConceptGroup =
  | '生命基础'
  | '细胞生物学'
  | '分子生物学'
  | '遗传学'
  | '实验技术'
  | '生物信息学'
  | '生物制造'
  | '合成生物学'
  | '诊断与医学'
  | '安全与伦理';

/**
 * 概念库条目。
 *
 * 设计意图：让每个概念都同时携带「定义 / 机制 / 边界 / 关联 / 章节」，
 * 避免学习者只记住一句结论而无法判断证据强度。
 */
export type ConceptEntry = {
  /** 中文术语，作为全库唯一主键 */
  term: string;
  /** 英文名或缩写，用于检索与对照 */
  alias: string;
  /** 学科分组 */
  group: ConceptGroup;
  /** 一句话定义，40 字以内 */
  summary: string;
  /** 机制或理解要点，80–140 字 */
  detail: string;
  /** 常见误解或适用边界，40–80 字 */
  misconception: string;
  /** 相关概念的中文术语名，2–4 个 */
  related: string[];
  /** 关联的 21 天课程章节号，1–21 */
  chapter: number;
};
