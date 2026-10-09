import * as SQLite from 'expo-sqlite';
import type { Answer, Corpus, Message } from '../types';

let pending: Promise<SQLite.SQLiteDatabase> | undefined;
export function openStore(corpus: Corpus): Promise<SQLite.SQLiteDatabase> {
  if (!pending) pending = initialize(corpus).catch(error => { pending = undefined; throw error; });
  return pending;
}
async function initialize(corpus: Corpus) {
  const db = await SQLite.openDatabaseAsync('lc-guide.db');
  await db.execAsync(`PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pages (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS passages (id TEXT PRIMARY KEY, page_id TEXT NOT NULL REFERENCES pages(id), text TEXT NOT NULL, verified INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS queries (id TEXT PRIMARY KEY, question TEXT NOT NULL, trace TEXT NOT NULL, score REAL NOT NULL, source TEXT);
  `);
  const meta = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', 'corpus_version');
  if (meta?.value !== corpus.version) {
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM passages; DELETE FROM pages; DELETE FROM messages; DELETE FROM queries;');
      for (const page of corpus.pages) {
        await db.runAsync('INSERT INTO pages (id, data) VALUES (?, ?)', page.id, JSON.stringify(page));
        // Draft OCR remains in the page record; only reviewed evidence is indexed.
        for (const passage of page.passages.filter(p => p.verified)) await db.runAsync('INSERT INTO passages VALUES (?, ?, ?, ?)', passage.id, page.id, passage.text, 1);
      }
      await db.runAsync('INSERT OR REPLACE INTO meta VALUES (?, ?)', 'corpus_version', corpus.version);
    });
  }
  return db;
}
export async function loadCorpus(db: SQLite.SQLiteDatabase, metadata: Corpus): Promise<Corpus> {
  const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM pages ORDER BY rowid');
  return { ...metadata, pages: rows.map(r => JSON.parse(r.data)) };
}
export async function loadMessages(db: SQLite.SQLiteDatabase): Promise<Message[]> {
  const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM (SELECT seq, data FROM messages ORDER BY seq DESC LIMIT 100) ORDER BY seq');
  return rows.map(r => JSON.parse(r.data));
}
export async function saveExchange(db: SQLite.SQLiteDatabase, question: Message, response: Message, answer: Answer) {
  await db.withTransactionAsync(async () => {
    for (const message of [question, response]) await db.runAsync('INSERT INTO messages (id, data) VALUES (?, ?)', message.id, JSON.stringify(message));
    await db.runAsync('INSERT INTO queries VALUES (?, ?, ?, ?, ?)', question.id, question.text, JSON.stringify(answer.trace), answer.score, answer.source ? JSON.stringify(answer.source) : null);
  });
}
