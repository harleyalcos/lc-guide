import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from 'image-size';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function validateBox(box) {
  if (!box || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(box[k]))) throw new Error('A passage needs a normalized x, y, width, height box.');
  if (box.x < 0 || box.y < 0 || box.width <= 0 || box.height <= 0 || box.x + box.width > 1.001 || box.y + box.height > 1.001) throw new Error('Highlight boxes must fit inside the image (0–1 coordinates, top-left origin).');
}
export async function importHandbook(folder, { output = projectRoot, review = join(projectRoot, 'tmp/handbook-review') } = {}) {
  const source = resolve(folder);
  let index;
  try { index = JSON.parse(await readFile(join(source, 'handbook-index.json'), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const filenames = (await readdir(source)).filter(f => /\.(png|jpe?g)$/i.test(f) && !(index?.exclude ?? []).includes(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (!filenames.length) throw new Error('No PNG or JPG pages found in the supplied folder.');
  const entries = index?.pages ?? filenames.map((file, i) => ({ file, label: String(i + 1), title: `Page ${i + 1}`, chapter: 'Student handbook' }));
  if (entries.length !== filenames.length || new Set(entries.map(e => e.file)).size !== filenames.length || entries.some(e => !filenames.includes(e.file))) throw new Error('handbook-index.json must list each page image exactly once (other image assets must be listed in exclude).');
  if (new Set(entries.map(e => String(e.label))).size !== entries.length) throw new Error('Page labels must be unique. Use cover/i/ii for front matter.');
  const pages = [], assets = [];
  let reviewed = 0;
  for (const [i, entry] of entries.entries()) {
    const bytes = await readFile(join(source, entry.file));
    const dimensions = imageSize(bytes);
    let { width, height } = dimensions;
    if (dimensions.orientation && dimensions.orientation >= 5) [width, height] = [height, width];
    if (!width || !height) throw new Error(`${entry.file} has invalid dimensions.`);
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const key = `scan-${String(i + 1).padStart(3, '0')}-${hash}`;
    let transcription;
    try { transcription = JSON.parse(await readFile(join(review, `${entry.file}.json`), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (transcription && transcription.imageSha256 !== createHash('sha256').update(bytes).digest('hex')) throw new Error(`The transcription for ${entry.file} belongs to a different image. Run OCR again.`);
    const passages = (transcription?.passages ?? []).map((p, j) => {
      if (typeof p.text !== 'string' || !p.text.trim()) throw new Error(`Empty passage on ${entry.file}.`);
      validateBox(p.box);
      const verified = p.verified === true;
      if (verified) reviewed++;
      return { id: `${key}-p${j + 1}`, text: p.text.trim(), topic: typeof p.topic === 'string' ? p.topic : undefined, box: p.box, verified };
    });
    pages.push({ id: key, imageKey: key, aspectRatio: width / height, label: String(entry.label), title: String(entry.title || `Page ${entry.label}`), chapter: String(entry.chapter || 'Student handbook'), isDemo: false, passages });
    assets.push({ key, file: join(source, entry.file), extension: extname(entry.file).toLowerCase() });
  }
  const edition = index?.edition ?? 'Laguna College student handbook';
  const version = createHash('sha256').update(JSON.stringify({ edition, pages })).digest('hex').slice(0, 20);
  // Validate the entire input before changing the app's active corpus.
  await mkdir(join(output, 'assets/handbook'), { recursive: true });
  await mkdir(join(output, 'src/data'), { recursive: true });
  for (const asset of assets) await copyFile(asset.file, join(output, 'assets/handbook', `${asset.key}${asset.extension}`));
  const map = assets.map(a => `  '${a.key}': require('../../assets/handbook/${a.key}${a.extension}'),`).join('\n');
  await writeFile(join(output, 'src/data/pageImages.ts'), `import type { ImageSourcePropType } from 'react-native';\n// Generated. Original image bytes are copied without alteration.\nexport const pageImages: Record<string, ImageSourcePropType> = {\n${map}\n};\n`);
  await writeFile(join(output, 'src/data/handbook.json'), JSON.stringify({ edition, version, pages }, null, 2) + '\n');
  return { pages: pages.length, reviewedPassages: reviewed, version, order: entries.map(e => ({ file: e.file, label: e.label })) };
}
async function main() {
  try {
    const folder = process.argv[2];
    if (!folder) throw new Error('Usage: npm run handbook:import -- /absolute/path/to/image-folder [--review /path/to/review]');
    const arg = process.argv.indexOf('--review');
    const result = await importHandbook(folder, { review: arg > -1 ? process.argv[arg + 1] : undefined });
    console.log(JSON.stringify(result, null, 2));
    console.log('Original image bytes preserved. Only passages marked verified:true are used for answers. Rebuild the NLP lexicon after import.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
