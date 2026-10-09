import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import corpusData from '../src/data/handbook.json';
import index from '../handbook-pictures/handbook-index.json';
import { answerQuestion, resolveSource } from '../src/nlp/retrieve';
import type { Corpus } from '../src/types';
const corpus = corpusData as Corpus;
test('all forty originals are present in the explicit book order and unchanged', async () => {
  assert.equal(corpus.pages.length, 40);
  for (let i = 0; i < index.pages.length; i++) {
    assert.equal(corpus.pages[i].label, index.pages[i].label);
    const original = await readFile(new URL('../handbook-pictures/' + index.pages[i].file, import.meta.url));
    const copy = await readFile(new URL('../assets/handbook/' + corpus.pages[i].imageKey + '.jpg', import.meta.url));
    assert.deepEqual(createHash('sha256').update(copy).digest(), createHash('sha256').update(original).digest());
  }
});
test('reviewed handbook questions resolve to the correct printed page and exact text', () => {
  for (const [question, expected] of [
    ['What is the attendance policy?', '9'],
    ['How many absences are allowed?', '9'],
    ['What if I am late?', '9'],
    ['Ano ang patakaran sa pagliban?', '9'],
    ['What are the school rules?', '25'],
    ['What are my responsibilities?', '25'],
    ['What are my duties?', '25'],
    ['How long can I borrow a library book?', '27'],
  ]) {
    const answer = answerQuestion(question, corpus);
    const found = answer.source && resolveSource(corpus, answer.source);
    assert.ok(found, question);
    assert.equal(found.page.label, expected, question);
    assert.equal(found.text, answer.text);
    assert.equal(answer.isDemo, false);
  }
  assert.match(answerQuestion('How many absences are allowed?', corpus).text, /more than 20%/);
  assert.match(answerQuestion('What if I am late?', corpus).text, /more than 10 minutes/);
  assert.match(answerQuestion('How long can I borrow a library book?', corpus).text, /one week/);
});
test('unreviewed topics do not leak draft OCR as evidence', () => {
  assert.equal(answerQuestion('What is the tuition fee?', corpus).source, undefined);
  assert.equal(answerQuestion('What are scholarship requirements?', corpus).source, undefined);
});
