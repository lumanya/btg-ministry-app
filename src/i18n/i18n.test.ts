// Every phrase the app translates must have a Kiswahili entry.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import sw from './sw.ts';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?)$/.test(f) && !f.endsWith('.test.ts') && !p.includes('/i18n/') ? [p] : [];
  });
}

test('every t("…") phrase has Kiswahili', () => {
  const missing = new Set<string>();
  for (const f of files(join(import.meta.dirname, '..'))) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*(['"])((?:(?!\1).)+)\1/g)) {
      if (!(m[2] in sw)) missing.add(`${m[2]}  (${f.split('/src/')[1]})`);
    }
  }
  assert.deepEqual([...missing], []);
});

test('placeholders match between English and Kiswahili', () => {
  const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
  const bad = Object.entries(sw).filter(([en, k]) => vars(en) !== vars(k));
  assert.deepEqual(bad, []);
});
