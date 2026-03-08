import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Supabase client (lazy init)
let supabase = null;
function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return null; // Fallback to file-based if no env vars
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ============ File-based fallback (dev mode) ============
const DB_PATH = join(process.cwd(), 'data', 'db.json');

function readDBFile() {
  const raw = readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDBFile(data) {
  const { writeFileSync } = require('fs');
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ============ Supabase-based (production) ============
async function readDBSupabase() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('app_data')
    .select('key, value');

  if (error) throw new Error(`Supabase read error: ${error.message}`);

  // Reconstruct the full DB object from rows
  const db = {};
  for (const row of data) {
    db[row.key] = row.value;
  }
  return db;
}

async function writeDBSupabase(dbData) {
  const sb = getSupabase();

  // Upsert each top-level key as a separate row
  const rows = Object.entries(dbData).map(([key, value]) => ({ key, value }));

  const { error } = await sb
    .from('app_data')
    .upsert(rows, { onConflict: 'key' });

  if (error) throw new Error(`Supabase write error: ${error.message}`);
}

// ============ Unified API ============
// Sync versions (file-based only, for dev)
export function readDB() {
  if (getSupabase()) {
    // In production with Supabase, this sync version reads from file as seed
    // API routes should use readDBAsync instead
    return readDBFile();
  }
  return readDBFile();
}

export function writeDB(data) {
  if (!getSupabase()) {
    writeDBFile(data);
  }
  // In production, use writeDBAsync
}

// Async versions (Supabase)
export async function readDBAsync() {
  if (getSupabase()) {
    return await readDBSupabase();
  }
  return readDBFile();
}

export async function writeDBAsync(data) {
  if (getSupabase()) {
    await writeDBSupabase(data);
  } else {
    writeDBFile(data);
  }
}
