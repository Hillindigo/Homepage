import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const siteOrigin = 'https://hillindigo.cc.cd';
const siteBase = '';
const feeds = [
  { lang: 'zh', language: 'zh-CN' },
  { lang: 'en', language: 'en-US' },
];
const problems = [];

function text(xml, tag) {
  return xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]?.trim();
}

function items(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
}

function validDate(value) {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

function validateAbsoluteUrl(value, label, feedPath) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') problems.push(`${feedPath}: ${label} must use HTTPS`);
    return url;
  } catch {
    problems.push(`${feedPath}: ${label} must be an absolute URL`);
    return undefined;
  }
}

for (const { lang, language } of feeds) {
  const feedPath = `${lang}/rss.xml`;
  const file = path.join(root, lang, 'rss.xml');
  let xml;

  try {
    xml = await readFile(file, 'utf8');
  } catch {
    problems.push(`${feedPath}: feed file is missing`);
    continue;
  }

  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    problems.push(`${feedPath}: missing UTF-8 XML declaration`);
  }
  if (!/<rss\b[^>]*\bversion="2\.0"/i.test(xml)) problems.push(`${feedPath}: expected RSS 2.0`);
  if (!text(xml, 'channel')) problems.push(`${feedPath}: missing channel`);
  if (!text(xml, 'title')) problems.push(`${feedPath}: missing channel title`);
  if (!text(xml, 'description')) problems.push(`${feedPath}: missing channel description`);
  if (text(xml, 'language') !== language) problems.push(`${feedPath}: expected language ${language}`);
  if (!validDate(text(xml, 'lastBuildDate'))) problems.push(`${feedPath}: invalid lastBuildDate`);

  const expectedSelf = `${siteOrigin}${siteBase}/${lang}/rss.xml`;
  const selfHref = xml.match(/<atom:link\b[^>]*\brel="self"[^>]*\bhref="([^"]+)"|<atom:link\b[^>]*\bhref="([^"]+)"[^>]*\brel="self"/i);
  const actualSelf = selfHref?.[1] ?? selfHref?.[2];
  if (actualSelf !== expectedSelf) problems.push(`${feedPath}: atom:link self must be ${expectedSelf}`);

  const feedItems = items(xml);
  if (!feedItems.length) problems.push(`${feedPath}: feed must contain at least one item`);
  const seenLinks = new Set();
  let previousDate = Number.POSITIVE_INFINITY;

  for (const [index, item] of feedItems.entries()) {
    const label = `item ${index + 1}`;
    for (const tag of ['title', 'description', 'link', 'guid', 'pubDate', 'dc:creator']) {
      if (!text(item, tag)) problems.push(`${feedPath}: ${label} is missing ${tag}`);
    }

    const link = text(item, 'link');
    const guid = text(item, 'guid');
    const pubDate = text(item, 'pubDate');
    const url = link && validateAbsoluteUrl(link, `${label} link`, feedPath);

    if (link && seenLinks.has(link)) problems.push(`${feedPath}: duplicate item link ${link}`);
    if (link) seenLinks.add(link);
    if (guid !== link) problems.push(`${feedPath}: ${label} guid must match its link`);
    if (!validDate(pubDate)) problems.push(`${feedPath}: ${label} has an invalid pubDate`);
    else {
      const timestamp = Date.parse(pubDate);
      if (timestamp > previousDate) problems.push(`${feedPath}: items are not sorted newest first`);
      previousDate = timestamp;
    }

    if (url) {
      if (url.origin !== siteOrigin || !url.pathname.startsWith(`${siteBase}/${lang}/`)) {
        problems.push(`${feedPath}: ${label} link is outside the ${lang} site section`);
      } else {
        const relative = decodeURIComponent(url.pathname.slice(siteBase.length + 1));
        const target = path.join(root, relative, 'index.html');
        try {
          await access(target);
        } catch {
          problems.push(`${feedPath}: ${label} link has no built page (${relative})`);
        }
      }
    }
  }

  console.log(`Checked ${feedPath}: ${feedItems.length} unique, date-sorted item(s).`);
}

if (problems.length) {
  console.error(`RSS validation failed with ${problems.length} problem(s):`);
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exit(1);
}

console.log('RSS feeds have valid metadata, absolute links and matching built pages.');
