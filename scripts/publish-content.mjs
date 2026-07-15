import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const tokens = process.argv.slice(2);
const dryRun = tokens.includes('--dry-run');
const positional = tokens.filter((token) => !token.startsWith('--'));
const type = positional[0] ?? '';
const translationKey = positional[1] ?? '';
const collections = { writing: 'blog', notes: 'notes', projects: 'projects', life: 'life' };
const languages = ['zh', 'en'];

function fail(message) {
  console.error(`\nPublish aborted: ${message}\n`);
  process.exit(1);
}

function unquote(value = '') {
  const match = value.trim().match(/^(['"])(.*)\1$/);
  return match ? match[2] : value.trim();
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (field) fields.set(field[1], field[2].trim());
  }
  return { match, fields, body: source.slice(match[0].length).trim() };
}

async function findEntry(collection, lang, key) {
  const directory = path.resolve('src', 'content', collection, lang);
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error?.code === 'ENOENT') fail(`content directory does not exist: ${directory}`);
    throw error;
  }

  const matches = [];
  for (const name of names.filter((value) => /\.(md|mdx)$/i.test(value))) {
    const file = path.join(directory, name);
    const source = await readFile(file, 'utf8');
    const parsed = parseFrontmatter(source);
    if (parsed && unquote(parsed.fields.get('translationKey')) === key) matches.push({ file, source, parsed, lang });
  }
  if (matches.length === 0) fail(`no ${lang} draft found for translationKey "${key}"`);
  if (matches.length > 1) fail(`translationKey "${key}" is duplicated for ${lang}`);
  return matches[0];
}

if (!(type in collections)) fail('type must be writing, notes, projects, or life');
if (!translationKey) fail('translationKey is required');

const entries = await Promise.all(languages.map((lang) => findEntry(collections[type], lang, translationKey)));
const draftStates = entries.map(({ parsed }) => parsed.fields.get('draft'));

if (draftStates.every((value) => value !== 'true')) {
  console.log(`Both translations for "${translationKey}" are already published.`);
  process.exit(0);
}
if (!draftStates.every((value) => value === 'true')) {
  fail('the zh and en entries must both be drafts before publishing');
}

for (const { file, parsed, lang } of entries) {
  if (parsed.fields.get('lang') !== lang) fail(`${path.relative(process.cwd(), file)} has a mismatched lang field`);
  if (!parsed.fields.get('pubDate')) fail(`${path.relative(process.cwd(), file)} is missing pubDate`);
  if (/^\[\s*\]$/.test(parsed.fields.get('tags') ?? '')) fail(`${path.relative(process.cwd(), file)} must include at least one tag`);
  if (!parsed.body) fail(`${path.relative(process.cwd(), file)} has an empty body`);
}

const updates = entries.map(({ file, source, parsed }) => {
  const updatedFrontmatter = parsed.match[1].replace(/^draft:\s*true\s*$/m, 'draft: false');
  if (updatedFrontmatter === parsed.match[1]) fail(`${path.relative(process.cwd(), file)} does not contain a valid draft: true field`);
  return { file, source: source.replace(parsed.match[1], updatedFrontmatter) };
});

if (dryRun) {
  console.log(`Ready to publish both translations for "${translationKey}":`);
  updates.forEach(({ file }) => console.log(`- ${path.relative(process.cwd(), file)}`));
  console.log('Dry run only; no files were changed.');
  process.exit(0);
}

await Promise.all(updates.map(({ file, source }) => writeFile(file, source, 'utf8')));
console.log(`Published both translations for "${translationKey}":`);
updates.forEach(({ file }) => console.log(`- ${path.relative(process.cwd(), file)}`));
console.log('Run npm run validate before committing.');
