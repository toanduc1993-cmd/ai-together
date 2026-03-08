import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'db.json');

export function readDB() {
  const raw = readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function writeDB(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}
