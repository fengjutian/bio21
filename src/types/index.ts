export type Course = {
  day: number; phase: string; title: string; subtitle: string; duration: string;
  level: '入门' | '进阶' | '挑战'; concepts: string[]; summary: string; lesson: string[];
  task: string; quiz: { question: string; options: string[]; answer: number; explanation: string };
};
export type Section = 'overview' | 'courses' | 'lab' | 'knowledge' | 'science' | 'concepts' | 'analytics' | 'glossary' | 'library' | 'practice';

export type TextbookChapter = {
  heading: string; objectives: string[]; reading: string; workedExample: string; misconception: string; practice: string; furtherReading: { title: string; url: string };
};

export type ChapterEnhancement = {
  summary: string;
  terms: { term: string; definition: string }[];
  review: { question: string; answer: string }[];
};
