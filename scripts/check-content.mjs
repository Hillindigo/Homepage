import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve('src/content');
const supportedCollections = new Set(['blog', 'notes', 'projects', 'life']);
const supportedLanguages = new Set(['zh', 'en']);
const requiredShared = ['title', 'description', 'pubDate', 'lang', 'tags'];
const collectionRequired = {
  blog: [],
  notes: [],
  projects: ['year', 'status', 'stack'],
  life: ['kind'],
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    }),
  );
  return children.flat();
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (field) fields.set(field[1], field[2].trim());
  }
  return { fields, body: source.slice(match[0].length).trim() };
}

const files = (await walk(root)).filter((file) => /\.(md|mdx)$/i.test(file));
const problems = [];
const translations = new Map();

for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const [collection, folderLang] = relative.split('/');
  const source = await readFile(file, 'utf8');
  const parsed = parseFrontmatter(source);

  if (!supportedCollections.has(collection)) problems.push(`${relative}: unknown collection "${collection}"`);
  if (!supportedLanguages.has(folderLang)) problems.push(`${relative}: content must live under a zh or en folder`);
  if (!parsed) {
    problems.push(`${relative}: missing or malformed frontmatter`);
    continue;
  }

  const { fields, body } = parsed;
  for (const key of [...requiredShared, ...(collectionRequired[collection] ?? [])]) {
    if (!fields.get(key)) problems.push(`${relative}: missing required field "${key}"`);
  }
  if (fields.get('lang') && fields.get('lang') !== folderLang) {
    problems.push(`${relative}: lang "${fields.get('lang')}" does not match folder "${folderLang}"`);
  }
  if (!body) problems.push(`${relative}: content body is empty`);

  const published = new Date(fields.get('pubDate'));
  if (fields.get('pubDate') && Number.isNaN(published.valueOf())) {
    problems.push(`${relative}: pubDate is not a valid date`);
  }
  const updatedValue = fields.get('updatedDate');
  if (updatedValue) {
    const updated = new Date(updatedValue);
    if (Number.isNaN(updated.valueOf())) problems.push(`${relative}: updatedDate is not a valid date`);
    else if (!Number.isNaN(published.valueOf()) && updated < published) {
      problems.push(`${relative}: updatedDate cannot be earlier than pubDate`);
    }
  }

  const tags = fields.get('tags');
  if (tags && (!tags.startsWith('[') || !tags.endsWith(']') || tags === '[]')) {
    problems.push(`${relative}: tags must be a non-empty inline list, for example [Astro, AI]`);
  }

  const translationKey = fields.get('translationKey');
  if (translationKey) {
    const key = `${collection}:${translationKey}`;
    const languages = translations.get(key) ?? [];
    languages.push({ lang: folderLang, relative });
    translations.set(key, languages);
  }
}

for (const [key, entries] of translations) {
  const languages = entries.map((entry) => entry.lang);
  for (const lang of supportedLanguages) {
    const count = languages.filter((value) => value === lang).length;
    if (count === 0) problems.push(`${key}: translationKey is missing its ${lang} counterpart`);
    if (count > 1) problems.push(`${key}: translationKey is duplicated for ${lang}`);
  }
}

if (problems.length > 0) {
  console.error(`Content validation failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Checked ${files.length} content files: frontmatter, dates, tags and translations are consistent.`);
