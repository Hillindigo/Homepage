import { readdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const base = '';
const htmlFiles = [];
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.name.endsWith('.html')) htmlFiles.push(target);
  }
};
await walk(root);

const broken = [];
for (const file of htmlFiles) {
  const html = await import('node:fs/promises').then(({ readFile }) => readFile(file, 'utf8'));
  const route = `/${path.relative(root, file).replaceAll('\\', '/').replace(/index\.html$/, '')}`;
  const links = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map(match => match[1]);
  for (const href of links) {
    if (/^(?:https?:|mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const resolved = new URL(href, `https://local${base}${route}`);
    let pathname = decodeURIComponent(resolved.pathname);
    if (!pathname.startsWith(base)) continue;
    pathname = pathname.slice(base.length).replace(/^\//, '');
    let target = path.join(root, pathname);
    if (!path.extname(target) || target.endsWith(path.sep)) target = path.join(target, 'index.html');
    try { await access(target, constants.F_OK); } catch { broken.push({ source: path.relative(root, file), href, expected: path.relative(root, target) }); }
  }
}

if (broken.length) {
  console.error(`Found ${broken.length} broken internal link(s):`);
  broken.forEach(item => console.error(`- ${item.source}: ${item.href} -> ${item.expected}`));
  process.exit(1);
}
console.log(`Checked ${htmlFiles.length} HTML files: all internal links resolve.`);
