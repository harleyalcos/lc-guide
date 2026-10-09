import lexicalData from '../data/lexicon.json';
import type { Analysis } from '../types';

type Entry = { lemma: string; porter: string; lancaster: string; regexp: string; snowball: string };
const words = lexicalData.words as Record<string, Entry>;
const vocabulary = new Set(Object.keys(words));
const stop = new Set('a an the i me my we our you your he she they their it its is am are was were be been being do does did to of in on at for with by from about what which who how when where can could would should please tell want know and or this that these those have has had will if then than there'.split(' '));
// Negation stays in tokens: "not permitted" must never normalize to "permitted".
const aliases: Record<string, string> = { patakaran: 'policy', tuntunin: 'rule', pagliban: 'absence', absent: 'absence', attendance: 'attendance', estudyante: 'student', responsibilidad: 'responsibility', aklat: 'book', silid: 'room', paaralan: 'school', bawal: 'prohibited', puwede: 'allowed', pwede: 'allowed', pinapayagan: 'allowed', hindi: 'not', klase: 'class', alituntunin: 'rule', tungkulin: 'responsibility', asal: 'conduct' };
const filipinoStop = new Set('ano ang mga ng sa po ba ko ako kami namin mo ninyo at ay isang tungkol'.split(' '));

export function expandContractions(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'")
    .replace(/\bwon't\b/g, 'will not').replace(/\bcan't\b/g, 'cannot')
    .replace(/\bcannot\b/g, 'can not').replace(/\bshan't\b/g, 'shall not')
    .replace(/\b(\w+)n't\b/g, '$1 not').replace(/\bi'm\b/g, 'i am')
    .replace(/\b(\w+)'re\b/g, '$1 are').replace(/\b(\w+)'ve\b/g, '$1 have')
    .replace(/\b(\w+)'ll\b/g, '$1 will').replace(/\b(\w+)'d\b/g, '$1 would')
    // Restrict 's to pronouns; a possessive like "student's" is not "student is".
    .replace(/\b(it|he|she|that|what|where|there)'s\b/g, '$1 is')
    .replace(/\b(\w+)'s\b/g, '$1');
}

export function removeRepeats(word: string): string {
  if (vocabulary.has(word) || aliases[word]) return word;
  // Search reductions breadth first; stop at a real word (keeps class, books, etc.).
  let candidates = [word];
  const visited = new Set(candidates);
  for (let round = 0; round < 24 && candidates.length; round++) {
    const next: string[] = [];
    for (const candidate of candidates) {
      for (const match of candidate.matchAll(/(.)\1+/g)) {
        const index = match.index!;
        const reduced = candidate.slice(0, index) + candidate.slice(index + 1);
        if (vocabulary.has(reduced) || aliases[reduced]) return reduced;
        if (!visited.has(reduced)) { visited.add(reduced); next.push(reduced); }
      }
    }
    candidates = next.slice(0, 64);
  }
  return word; // Never change an unknown name just to make it shorter.
}

export function analyze(text: string): Analysis {
  const normalized = expandContractions(text).normalize('NFKC');
  const tokens = (normalized.match(/[\p{L}\p{N}]+/gu) ?? [])
    .map(removeRepeats).filter(t => !stop.has(t) && !filipinoStop.has(t))
    .map(t => aliases[t] ?? t);
  const lemmas = tokens.map(t => words[t]?.lemma ?? t);
  const stems = lemmas.map(t => words[t]?.snowball ?? t);
  const expanded = new Set(lemmas);
  for (const lemma of lemmas) {
    const concept = lexicalData.concepts.find(c => c.terms.includes(lemma));
    if (concept) for (const term of concept.terms) expanded.add(term);
  }
  return { normalized, tokens, lemmas, stems, expanded: [...expanded], negated: tokens.includes('not') || tokens.includes('never') || tokens.includes('no') };
}

export function features(text: string): string[] {
  const result = analyze(text);
  return [...new Set([...result.lemmas, ...result.stems])];
}
