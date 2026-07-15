import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const tokens = process.argv.slice(2);
const args = {};
const positional = [];
for (let index = 0; index < tokens.length; index += 1) {
  const value = tokens[index];
  if (!value.startsWith('--')) { positional.push(value); continue; }
  const key = value.slice(2);
  const next = tokens[index + 1];
  args[key] = !next || next.startsWith('--') ? true : next;
  if (args[key] !== true) index += 1;
}

const type = String(args.type || positional[0] || 'writing');
const lang = String(args.lang || positional[1] || 'zh');
const slug = String(args.slug || positional[2] || '');
const title = String(args.title || positional[3] || '');
const description = String(args.description || positional[4] || '');
const folders = { writing: 'blog', notes: 'notes', projects: 'projects', life: 'life' };

const fail = (message) => { console.error(`\nError: ${message}\n`); process.exit(1); };
if (!(type in folders)) fail('--type must be writing, notes, projects, or life');
if (!['zh', 'en'].includes(lang)) fail('--lang must be zh or en');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('--slug must use lowercase letters, numbers, and hyphens');
if (!title) fail('--title is required');
if (!description) fail('--description is required');

const today = new Date().toISOString().slice(0, 10);
const extra = type === 'projects'
  ? `year: ${new Date().getFullYear()}\nstatus: active\nstack: []\n`
  : type === 'life' ? 'kind: journal\n' : '';
const heading = lang === 'zh' ? '从这里开始' : 'Start here';
const prompt = lang === 'zh' ? '在这里开始写作。' : 'Begin writing here.';
const content = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\npubDate: ${today}\nlang: ${lang}\ntags: []\ndraft: true\ntranslationKey: ${slug}\n${extra}---\n\n## ${heading}\n\n${prompt}\n`;
const target = path.resolve('src', 'content', folders[type], lang, `${slug}.md`);

if (args['dry-run'] || positional[5] === 'dry-run') {
  console.log(`Would create: ${target}\n\n${content}`);
  process.exit(0);
}

try { await access(target, constants.F_OK); fail(`file already exists: ${target}`); } catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, content, 'utf8');
console.log(`Created ${target}\nDraft mode is on. Set draft: false when ready to publish.`);
