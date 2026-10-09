import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/handbook.json';
import metrics from '../scripts/handbook-font-metrics.json';
import type { Corpus } from '../src/types';
import { answerQuestion, resolveSource } from '../src/nlp/retrieve';

const corpus = data as Corpus;
const fonts = metrics as Record<string, Record<string, number>>;

test('every handbook page has native text within its paper bounds', () => {
  assert.equal(corpus.pages.length, 40);
  for (const page of corpus.pages) {
    const layout = page.layout;
    assert.ok(layout?.reviewed, page.label);
    assert.ok(layout.lines.length > 0, page.label);
    assert.equal(new Set(layout.lines.map(l => l.id)).size, layout.lines.length);
    for (const line of layout.lines) {
      assert.ok(line.x >= 0 && line.x + line.width <= layout.width, `${page.label}: ${line.text}`);
      assert.ok(line.y >= 0 && line.y + line.fontSize * 1.18 < 1040, `${page.label}: ${line.text}`);
      const width = [...line.text].reduce((n, c) => n + (fonts[line.bold ? 'bold' : 'regular'][c] ?? .55), 0) * line.fontSize;
      if (!line.leader) assert.ok(width <= line.width, `${page.label}: clipped line ${line.text}`);
    }
  }
});

test('grading tables retain separate numeric, percent, and description columns', () => {
  const lines = corpus.pages.find(p => p.label === '10')!.layout!.lines;
  const rows = new Map<number, typeof lines>();
  for (const line of lines) rows.set(line.y, [...(rows.get(line.y) ?? []), line]);
  const tableRows = [...rows.values()].filter(r => r.length === 3);
  assert.equal(tableRows.length, 28);
  for (const row of tableRows) {
    assert.ok(row[0].x + row[0].width < row[1].x);
    assert.ok(row[1].x + row[1].width < row[2].x);
  }
});

test('a courses answer opens digitized printed page 3 and highlights its course list', () => {
  const answer = answerQuestion('What courses are offered?', corpus);
  const source = answer.source && resolveSource(corpus, answer.source);
  assert.ok(source);
  assert.equal(source.page.label, '3');
  assert.match(source.text, /Accounting Information System \(BSAIS\)/);
  assert.match(source.text, /Computer Science \(BSCS\)/);
  const passage = source.page.passages.find(p => p.id === answer.source!.passageId)!;
  assert.ok(passage.box);
  assert.ok(passage.box.y > .35 && passage.box.y + passage.box.height < .9);
  assert.equal(source.page.layout!.folio, '3');
  assert.equal(source.page.layout!.lines.filter(l => l.leader).length, 5);
});
