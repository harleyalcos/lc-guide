import type { Answer, Corpus, HandbookPage, Source } from '../types';
import { analyze, features } from './normalize';

export const RETRIEVAL_THRESHOLD = 0.44;
const generic = new Set(['policy', 'rule', 'school', 'student', 'handbook', 'regulation', 'information', 'section']);
const intentTerms = new Set(['allow', 'allowed', 'permit', 'permitted', 'prohibit', 'prohibited', 'many', 'much', 'number', 'limit', 'maximum', 'minimum', 'require', 'requirement', 'happen', 'need']);
const followUp = /^(?:and\s+)?(?:what|how) about\b|\b(?:it|that|those|this policy|the same|more|else|another)\b/i;
const detailRequest = /\b(how many|how much|limit|maximum|minimum|percent|percentage|hours|opening|closing|deadline|fees?|penalt(?:y|ies)|sanctions?|fines?)\b/i;
const isGeneralRulesQuery = (q: string) =>
  /^(?:what\s+are\s+the\s+)?(?:school\s+rules|rules\s+of\s+the\s+school|rules|policies|school\s+policies|handbook\s+rules|student\s+rules|code\s+of\s+conduct|student\s+conduct|mga\s+patakaran|mga\s+tuntunin|alituntunin)(?:\s*\?)?$/i.test(q.trim());

function getArticleHeader(page: HandbookPage, passageText: string): string | undefined {
  if (page.label === '25') return 'Article I - General Behavior';
  if (page.label === '26') {
    if (passageText.includes('Classroom')) return 'Article II - Behavior in Classroom';
    return 'Article I - General Behavior (Continued)';
  }
  if (page.label === '9') return 'VII. Class Attendance';
  if (page.label === '27') {
    if (passageText.includes('corridor') || passageText.includes('stairway')) return 'Corridor & Stairway Regulations';
    return 'Library Regulations';
  }
  if (page.label === '28') {
    if (passageText.includes('social') || passageText.includes('gate crash')) return 'Social Functions';
    if (passageText.includes('examination')) return 'Examinations';
    return 'Academic Functions';
  }
  if (page.label === '3') return 'Courses Offered';
  return page.title;
}

// Preprocess a corpus once, rather than re-tokenizing forty scans on every keypress.
const indexes = new WeakMap<Corpus, ReturnType<typeof buildIndex>>();
function buildIndex(corpus: Corpus) {
  const documents = corpus.pages.flatMap(page => page.passages.filter(p => p.verified).map(passage => ({ page, passage, terms: new Set(features(`${page.title} ${page.chapter} ${passage.topic ?? ''} ${passage.text}`)) })));
  const df = new Map<string, number>();
  for (const doc of documents) for (const term of doc.terms) df.set(term, (df.get(term) ?? 0) + 1);
  return { documents, df };
}

export function answerQuestion(question: string, corpus: Corpus, previousTopic?: string): Answer {
  if (isGeneralRulesQuery(question)) {
    const isDemo = corpus.pages.every(p => p.isDemo);
    return {
      text: isDemo
        ? 'The demonstration handbook covers several areas. Which one would you like to explore?'
        : 'The student handbook covers rules across several areas. Which section would you like to explore?',
      options: isDemo
        ? [
            { label: 'Student Conduct & Respect', query: 'What is the conduct policy?', icon: 'shield' },
            { label: 'Student Responsibilities', query: 'What are my responsibilities?', icon: 'user' },
            { label: 'Attendance & Absences', query: 'What is the attendance policy?', icon: 'calendar' },
            { label: 'Library Rules', query: 'Where can I read library books?', icon: 'book' },
          ]
        : [
            { label: 'General Conduct & Dress Code', query: 'What is the general conduct and dress code policy?', pageLabel: '25', icon: 'shield' },
            { label: 'Classroom Behavior & Cheating', query: 'What are the rules for classroom behavior and cheating?', pageLabel: '26', icon: 'book' },
            { label: 'Attendance & Absences', query: 'What is the attendance policy?', pageLabel: '9', icon: 'calendar' },
            { label: 'Library & Corridor Rules', query: 'What are the library and corridor rules?', pageLabel: '27', icon: 'file-text' },
            { label: 'Academic & Social Functions', query: 'What are the rules for academic and social functions?', pageLabel: '28', icon: 'award' },
          ],
      trace: analyze(question),
      score: 1.0,
      topic: 'School rules',
      isDemo,
    };
  }

  const base = analyze(question);
  const specific = base.lemmas.filter(t => !generic.has(t) && !['not', 'no', 'never', 'more', 'else'].includes(t));
  const newTopic = corpus.pages.some(p => p.title !== previousTopic && features(`${p.title} ${p.chapter}`).some(term => base.expanded.includes(term) && !generic.has(term)));
  const useContext = !!previousTopic && followUp.test(question) && specific.length <= 2 && !newTopic;

  if (!indexes.has(corpus)) indexes.set(corpus, buildIndex(corpus));
  const { documents, df } = indexes.get(corpus)!;

  const trace = analyze(useContext ? `${question} ${previousTopic}` : question);
  const queryTerms = new Set([...trace.lemmas, ...trace.stems]);
  const topicTerms = trace.lemmas.filter(t => !generic.has(t) && !intentTerms.has(t) && !['not', 'no', 'never', 'more', 'else'].includes(t));
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

  const articleHeader = getArticleHeader(best.page, best.passage.text);
  const viewAllLabel = best.page.isDemo ? 'View in handbook' : `View all sections · p. ${best.page.label}`;

  // Extract original text only. No generated policy or inference about permissions.
  return {
    text: best.passage.text,
    articleHeader,
    source: { pageId: best.page.id, passageId: best.passage.id },
    topic: best.page.title,
    isDemo: best.page.isDemo,
    trace,
    score: best.score,
    viewAllLabel
  };
}

export function resolveSource(corpus: Corpus, source: Source): { page: HandbookPage; text: string } | undefined {
  const page = corpus.pages.find(p => p.id === source.pageId);
  const passage = page?.passages.find(p => p.id === source.passageId);
  return page && passage ? { page, text: passage.text } : undefined;
}

