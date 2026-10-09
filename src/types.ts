export type Box = { x: number; y: number; width: number; height: number };
export type Passage = { id: string; text: string; topic?: string; box?: Box; verified: boolean };
export type PrintLine = {
  id: string; text: string; x: number; y: number; width: number; fontSize: number;
  bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right' | 'justify';
  rightText?: string; leader?: boolean;
};
export type PageLayout = {
  width: number; height: number; lines: PrintLine[]; reviewed: boolean;
  seal?: { x: number; y: number; size: number; opacity?: number }; folio?: string;
};
export type HandbookPage = {
  id: string; label: string; title: string; chapter: string;
  isDemo: boolean; imageKey?: string; aspectRatio?: number; layout?: PageLayout; passages: Passage[];
};
export type Corpus = { edition: string; version: string; pages: HandbookPage[] };
export type Source = { pageId: string; passageId: string };
export type Message = { id: string; role: 'student' | 'guide'; text: string; source?: Source; topic?: string; isDemo?: boolean };
export type Analysis = { normalized: string; tokens: string[]; lemmas: string[]; stems: string[]; expanded: string[]; negated: boolean };
export type Answer = { text: string; source?: Source; topic?: string; isDemo?: boolean; trace: Analysis; score: number };
