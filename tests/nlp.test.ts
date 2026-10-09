import { test } from 'node:test';
import assert from 'node:assert/strict';
import corpusData from './fixtures/demo-handbook.json';
import { analyze, expandContractions, removeRepeats } from '../src/nlp/normalize';
import { answerQuestion, resolveSource } from '../src/nlp/retrieve';
import type { Corpus } from '../src/types';
const corpus = corpusData as Corpus;

test('contractions expand before tokenization and retain negation', () => {
  assert.equal(expandContractions("I can’t and won’t ignore a student's rules"), 'i can not and will not ignore a student rules');
  assert.ok(analyze("I can't attend class").tokens.includes('not'));
});
test('repeated letters normalize without damaging valid doubles', () => {
  assert.equal(removeRepeats('helloooooooo'), 'hello');
  assert.equal(removeRepeats('hiiiiiii'), 'hi');
  assert.equal(removeRepeats('class'), 'class');
  assert.equal(removeRepeats('books'), 'books');
});
test('noun and verb lemmas align inflected questions', () => {
  assert.ok(analyze('responsibilities').lemmas.includes('responsibility'));
  assert.ok(analyze('attending').lemmas.includes('attendance'));
});
test('supported answers quote the exact cited passage', () => {
  for (const [q, pageId] of [
    ['What is the attendance policy?', 'demo-attendance'],
    ['What are the school rules?', 'demo-conduct'],
    ['What are my responsibilities?', 'demo-responsibilities'],
    ['What are my duties?', 'demo-responsibilities'],
    ['Ano ang patakaran sa pagliban?', 'demo-attendance'],
    ['Where can I read library books?', 'demo-library'],
  ]) {
    const answer = answerQuestion(q, corpus);
    assert.equal(answer.source?.pageId, pageId, q);
    assert.equal(resolveSource(corpus, answer.source!)?.text, answer.text);
    assert.equal(answer.isDemo, true);
  }
});
test('unsupported requests and exact policy limits have no invented answer', () => {
  for (const q of ['How many absences are allowed?', 'What is the tuition fee?', 'Who is the school president?', 'What is the attendance rule on Mars?', 'What are the school rules about cryptocurrency?', 'What is the weather?', '']) assert.equal(answerQuestion(q, corpus).source, undefined, q);
});
test('unreviewed OCR cannot become policy evidence', () => {
  const draft: Corpus = { ...corpus, pages: corpus.pages.map(p => ({ ...p, isDemo: false, passages: p.passages.map(t => ({ ...t, verified: false })) })) };
  assert.equal(answerQuestion('attendance policy', draft).source, undefined);
});
test('a colliding stem cannot substitute an unrelated topic', () => {
  const subset: Corpus = { ...corpus, pages: [corpus.pages[0]] };
  assert.equal(answerQuestion('What are my responsibilities?', subset).source, undefined);
});
test('a short follow-up retains topic but a new specific question changes it', () => {
  assert.equal(answerQuestion('Tell me more about that', corpus, 'Attendance & absences').source?.pageId, 'demo-attendance');
  assert.equal(answerQuestion('What about the library books?', corpus, 'Attendance & absences').source?.pageId, 'demo-library');
});
