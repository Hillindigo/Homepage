import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('dist');
const siteOrigin='https://hillindigo.github.io';
const siteBase='/Homepage';
const expectedIndex=`${siteOrigin}${siteBase}/sitemap-index.xml`;
const problems=[];
const htmlFiles=[];

async function walk(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const target=path.join(directory,entry.name);
    if(entry.isDirectory())await walk(target);
    else if(entry.name.endsWith('.html'))htmlFiles.push(target);
  }
}

function locations(xml){
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/gis)].map(match=>match[1].trim().replaceAll('&amp;','&'));
}

function absoluteSiteUrl(value,label){
  try{
    const url=new URL(value);
    if(url.protocol!=='https:')problems.push(`${label}: URL must use HTTPS`);
    if(url.origin!==siteOrigin||!url.pathname.startsWith(`${siteBase}/`))problems.push(`${label}: URL is outside the configured site`);
    return url;
  }catch{
    problems.push(`${label}: invalid absolute URL`);
    return undefined;
  }
}

const robots=await readFile(path.join(root,'robots.txt'),'utf8');
const sitemapDirectives=[...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map(match=>match[1]);
if(!/^User-agent:\s*\*\s*$/im.test(robots))problems.push('robots.txt: missing wildcard user agent');
if(!/^Allow:\s*\/\s*$/im.test(robots))problems.push('robots.txt: missing root allow rule');
if(sitemapDirectives.length!==1||sitemapDirectives[0]!==expectedIndex)problems.push(`robots.txt: expected one Sitemap directive for ${expectedIndex}`);

const indexXml=await readFile(path.join(root,'sitemap-index.xml'),'utf8');
if(!indexXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))problems.push('sitemap-index.xml: missing UTF-8 XML declaration');
if(!/<sitemapindex\b/i.test(indexXml))problems.push('sitemap-index.xml: missing sitemapindex root');
const sitemapUrls=locations(indexXml);
if(!sitemapUrls.length)problems.push('sitemap-index.xml: no child sitemaps');
if(new Set(sitemapUrls).size!==sitemapUrls.length)problems.push('sitemap-index.xml: duplicate child sitemap URL');

const pageUrls=[];
for(const [index,sitemapUrl] of sitemapUrls.entries()){
  const url=absoluteSiteUrl(sitemapUrl,`sitemap-index.xml entry ${index+1}`);
  if(!url)continue;
  const fileName=path.basename(url.pathname);
  if(!/^sitemap-\d+\.xml$/.test(fileName))problems.push(`sitemap-index.xml: unexpected child file ${fileName}`);
  const file=path.join(root,fileName);
  try{await access(file)}catch{problems.push(`sitemap-index.xml: missing child file ${fileName}`);continue}
  const xml=await readFile(file,'utf8');
  if(!/<urlset\b/i.test(xml))problems.push(`${fileName}: missing urlset root`);
  pageUrls.push(...locations(xml));
}

if(new Set(pageUrls).size!==pageUrls.length)problems.push('sitemap: duplicate page URL');
for(const [index,value] of pageUrls.entries())absoluteSiteUrl(value,`sitemap page ${index+1}`);

await walk(root);
const canonicalUrls=[];
for(const file of htmlFiles){
  const relative=path.relative(root,file).replaceAll('\\','/');
  if(relative==='404.html')continue;
  const html=await readFile(file,'utf8');
  const canonical=html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["']|<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["']/i);
  const value=canonical?.[1]??canonical?.[2];
  if(!value)problems.push(`${relative}: missing canonical URL for sitemap comparison`);
  else canonicalUrls.push(value);
}

const sitemapSet=new Set(pageUrls);
const canonicalSet=new Set(canonicalUrls);
for(const value of canonicalSet)if(!sitemapSet.has(value))problems.push(`sitemap: missing canonical page ${value}`);
for(const value of sitemapSet)if(!canonicalSet.has(value))problems.push(`sitemap: unexpected page ${value}`);
for(const lang of ['zh','en'])if(!sitemapSet.has(`${siteOrigin}${siteBase}/${lang}/`))problems.push(`sitemap: missing ${lang} homepage`);

if(problems.length){
  console.error(`Sitemap validation failed with ${problems.length} problem(s):`);
  problems.forEach(problem=>console.error(`- ${problem}`));
  process.exit(1);
}

console.log(`Checked robots.txt, ${sitemapUrls.length} sitemap file(s) and ${pageUrls.length} canonical page URL(s).`);
