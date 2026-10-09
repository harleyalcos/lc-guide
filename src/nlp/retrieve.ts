import type { Answer, Corpus, HandbookPage, Source } from '../types';
import { analyze, features } from './normalize';

export const RETRIEVAL_THRESHOLD = 0.44;
const generic = new Set(['policy', 'rule', 'school', 'student', 'handbook', 'regulation', 'information', 'section']);
const intentTerms = new Set(['allow', 'allowed', 'permit', 'permitted', 'prohibit', 'prohibited', 'many', 'much', 'number', 'limit', 'maximum', 'minimum', 'require', 'requirement', 'happen', 'need']);
const followUp = /^(?:and\s+)?(?:what|how) about\b|\b(?:it|that|those|this policy|the same|more|else)\b/i;
const detailRequest = /\b(how many|how much|limit|maximum|minimum|percent|percentage|hours|opening|closing|deadline|fees?|penalt(?:y|ies)|sanctions?|fines?)\b/i;
// Preprocess a corpus once, rather than re-tokenizing forty scans on every keypress.
const indexes = new WeakMap<Corpus, ReturnType<typeof buildIndex>>();
function buildIndex(corpus: Corpus) {
  const documents = corpus.pages.flatMap(page => page.passages.filter(p => p.verified).map(passage => ({ page, passage, terms: new Set(features(`${page.title} ${page.chapter} ${passage.topic ?? ''} ${passage.text}`)) })));
  const df = new Map<string, number>();
  for (const doc of documents) for (const term of doc.terms) df.set(term, (df.get(term) ?? 0) + 1);
  return { documents, df };
}

export function answerQuestion(question: string, corpus: Corpus, previousTopic?: string): Answer {
  const base = analyze(question);
  const specific = base.lemmas.filter(t => !generic.has(t) && !['not', 'no', 'never', 'more', 'else'].includes(t));
  const newTopic = corpus.pages.some(p => p.title !== previousTopic && features(`${p.title} ${p.chapter}`).some(term => base.expanded.includes(term) && !generic.has(term)));
  const useContext = !!previousTopic && followUp.test(question) && specific.length <= 2 && !newTopic;
  const trace = analyze(useContext ? `${question} ${previousTopic}` : question);
  const queryTerms = new Set([...trace.lemmas, ...trace.stems]);
  const topicTerms = trace.lemmas.filter(t => !generic.has(t) && !intentTerms.has(t) && !['not', 'no', 'never', 'more', 'else'].includes(t));
  if (!indexes.has(corpus)) indexes.set(corpus, buildIndex(corpus));
  const { documents, df } = indexes.get(corpus)!;
  const idf = (term: string) => Math.log(1 + (documents.length + 1) / ((df.get(term) ?? 0) + 1));
  const weight = (term: string) => idf(term) * (generic.has(term) ? 0.15 : intentTerms.has(term) ? 0.25 : 1);
  const queryFeatures = new Map(trace.lemmas.map(t => [t, { forms: features(t), related: analyze(t).expanded }]));

  const ranked = documents.map(doc => {
    const lemmas = [...new Set(trace.lemmas)];
    const denominator = lemmas.reduce((sum, t) => sum + weight(t), 0) || 1;
    const coverage = lemmas.reduce((sum, t) => {
      const direct = doc.terms.has(t);
      const stemMatch = queryFeatures.get(t)!.forms.some(f => doc.terms.has(f));
      const related = queryFeatures.get(t)!.related.some(e => doc.terms.has(e));
      return sum + weight(t) * (direct ? 1 : related ? 0.78 : stemMatch ? 0.35 : 0);
    }, 0) / denominator;
    const coveredTopicTerms = topicTerms.filter(t => doc.terms.has(t) || queryFeatures.get(t)!.related.some(e => !generic.has(e) && doc.terms.has(e)));
    const topicMatch = topicTerms.length ? coveredTopicTerms.length / topicTerms.length > 0.6 : ['rule', 'regulation'].some(t => queryTerms.has(t) && doc.terms.has(t));
    return { ...doc, score: topicMatch ? coverage : 0 };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const uncertain = (text: string): Answer => ({ text, trace, score: best?.score ?? 0 });
  if (!queryTerms.size || !best || best.score < RETRIEVAL_THRESHOLD) {
    return uncertain(corpus.pages.some(p => !p.isDemo)
      ? 'I couldn’t find a reviewed handbook passage that answers that question. Try naming the policy, or browse the handbook.'
      : 'I couldn’t find that in the demo handbook. You can ask about attendance, conduct, responsibilities, or the library. Official answers will be available once the handbook pages are added.');
  }
  if (best.page.isDemo && detailRequest.test(question)) {
    return uncertain('The demo handbook does not contain that specific detail. I’ll need the original handbook to give you an official number, procedure, or penalty.');
  }
  // Extract original text only. No generated policy or inference about permissions.
  return { text: best.passage.text, source: { pageId: best.page.id, passageId: best.passage.id }, topic: best.page.title, isDemo: best.page.isDemo, trace, score: best.score };
}

export function resolveSource(corpus: Corpus, source: Source): { page: HandbookPage; text: string } | undefined {
  const page = corpus.pages.find(p => p.id === source.pageId);
  const passage = page?.passages.find(p => p.id === source.passageId);
  return page && passage ? { page, text: passage.text } : undefined;
}
