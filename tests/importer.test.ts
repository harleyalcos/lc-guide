import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { importHandbook, validateBox } from '../scripts/import-handbook.mjs';

test('highlight bounds reject invalid locations', () => {
  assert.throws(() => validateBox({ x: 0.9, y: 0, width: 0.5, height: 0.1 }));
  assert.throws(() => validateBox({ x: NaN, y: 0, width: 0.2, height: 0.1 }));
  validateBox({ x: 0.1, y: 0.3, width: 0.7, height: 0.15 });
});
test('reviewed OCR maps to its original image, and a changed scan is rejected', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lc-guide-reviewed-'));
  try {
    const source = join(root, 'input'), review = join(root, 'review'), output = join(root, 'output');
    await mkdir(source); await mkdir(review);
    const bytes = await readFile(new URL('../assets/icon.png', import.meta.url));
    await writeFile(join(source, '1.png'), bytes);
    const sidecar = { imageSha256: createHash('sha256').update(bytes).digest('hex'), passages: [
      { text: 'Reviewed policy paragraph.', verified: true, box: { x: 0.1, y: 0.3, width: 0.8, height: 0.1 } },
      { text: 'Draft paragraph.', verified: false, box: { x: 0.1, y: 0.5, width: 0.8, height: 0.1 } },
    ] };
    await writeFile(join(review, '1.png.json'), JSON.stringify(sidecar));
    assert.equal((await importHandbook(source, { output, review })).reviewedPassages, 1);
    const data = JSON.parse(await readFile(join(output, 'src/data/handbook.json'), 'utf8'));
    assert.equal(data.pages[0].passages[0].text, 'Reviewed policy paragraph.');
    assert.equal(data.pages[0].passages[1].verified, false);
    sidecar.imageSha256 = 'wrong-image';
    await writeFile(join(review, '1.png.json'), JSON.stringify(sidecar));
    await assert.rejects(importHandbook(source, { output, review }), /different image/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('import preserves original PNG bytes and natural ordering; drafts remain unreviewed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lc-guide-import-'));
  try {
    const source = join(root, 'input'), output = join(root, 'output');
    await mkdir(source);
    const bytes = await readFile(new URL('../assets/icon.png', import.meta.url));
    for (const f of ['page-10.png', 'page-2.png', 'page-1.png']) await writeFile(join(source, f), bytes);
    const result = await importHandbook(source, { output, review: join(root, 'review') });
    assert.deepEqual(result.order.map((e: { file: string }) => e.file), ['page-1.png', 'page-2.png', 'page-10.png']);
    assert.equal(result.reviewedPassages, 0);
    const copied = await readdir(join(output, 'assets/handbook'));
    assert.equal(copied.length, 3);
    for (const file of copied) assert.deepEqual(await readFile(join(output, 'assets/handbook', file)), bytes);
    const corpus = JSON.parse(await readFile(join(output, 'src/data/handbook.json'), 'utf8'));
    assert.ok(corpus.pages.every((p: { passages: unknown[]; isDemo: boolean }) => !p.isDemo && p.passages.length === 0));
  } finally { await rm(root, { recursive: true, force: true }); }
});
