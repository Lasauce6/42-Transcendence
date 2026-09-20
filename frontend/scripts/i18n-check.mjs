#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGS = ['fr', 'en', 'es'];
const I18N_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'i18n');

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? flatten(value, path) : [path];
  });
}

const keysByLang = {};
for (const lang of LANGS) {
  const file = join(I18N_DIR, `${lang}.json`);
  try {
    keysByLang[lang] = new Set(flatten(JSON.parse(await readFile(file, 'utf8'))));
  } catch (error) {
    console.error(`${lang}.json illisible : ${error.message}`);
    process.exit(1);
  }
}

const allKeys = new Set(LANGS.flatMap((lang) => [...keysByLang[lang]]));
let failed = false;

for (const lang of LANGS) {
  const missing = [...allKeys].filter((key) => !keysByLang[lang].has(key)).sort();
  if (missing.length > 0) {
    failed = true;
    console.error(`\n❌ ${lang}.json : ${missing.length} clé(s) manquante(s)`);
    for (const key of missing) console.error(`   - ${key}`);
  }
}

if (failed) {
  console.error('\nAjoute les clés manquantes dans les 3 fichiers (règle #41).');
  process.exit(1);
}

console.log(` i18n OK — ${allKeys.size} clés identiques en ${LANGS.join(', ')}`);
