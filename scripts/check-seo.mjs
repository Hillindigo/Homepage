import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const htmlFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.name.endsWith('.html')) htmlFiles.push(target);
  }
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map((match) => [match[1].toLowerCase(), match[2]]),
  );
}

function findTags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => attributes(match[0]));
}

await walk(root);
const problems = [];

for (const file of htmlFiles) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const html = await readFile(file, 'utf8');
  const metas = findTags(html, 'meta');
  const links = findTags(html, 'link');
  const htmlLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
  const title = html.match(/<title>(.*?)<\/title>/is)?.[1]?.trim();
  const meta = (key, value) => metas.find((item) => item[key] === value)?.content;
  const canonicalLinks = links.filter((item) => item.rel === 'canonical');
  const canonical = canonicalLinks[0]?.href;
  const alternates = new Set(links.filter((item) => item.rel === 'alternate' && item.hreflang).map((item) => item.hreflang));

  if (!htmlLang) problems.push(`${relative}: missing html lang`);
  if (!title) problems.push(`${relative}: missing title`);
  if (!meta('name', 'description')) problems.push(`${relative}: missing meta description`);
  if (canonicalLinks.length !== 1) problems.push(`${relative}: expected exactly one canonical link`);
  if (canonical && !/^https:\/\//.test(canonical)) problems.push(`${relative}: canonical URL must use HTTPS`);
  if (meta('property', 'og:url') !== canonical) problems.push(`${relative}: og:url must match canonical URL`);

  for (const property of ['og:title', 'og:description', 'og:image', 'og:image:alt', 'og:locale']) {
    if (!meta('property', property)) problems.push(`${relative}: missing ${property}`);
  }
  if (meta('property', 'og:image:width') !== '1200') problems.push(`${relative}: og:image:width must be 1200`);
  if (meta('property', 'og:image:height') !== '630') problems.push(`${relative}: og:image:height must be 630`);
  if (meta('property', 'og:image:type') !== 'image/jpeg') problems.push(`${relative}: og:image:type must be image/jpeg`);
  if (!meta('property', 'og:image')?.endsWith('/images/social-card.jpg')) problems.push(`${relative}: og:image must use the social card`);
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
    if (!meta('name', name)) problems.push(`${relative}: missing ${name}`);
  }
  if (meta('name', 'twitter:card') !== 'summary_large_image') problems.push(`${relative}: twitter:card must be summary_large_image`);
  if (meta('name', 'twitter:image') !== meta('property', 'og:image')) problems.push(`${relative}: twitter:image must match og:image`);
  for (const hreflang of ['zh-CN', 'en', 'x-default']) {
    if (!alternates.has(hreflang)) problems.push(`${relative}: missing hreflang ${hreflang}`);
  }
}

if (problems.length) {
  console.error(`SEO validation failed with ${problems.length} problem(s):`);
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML files: canonical, social metadata and language alternates are complete.`);
