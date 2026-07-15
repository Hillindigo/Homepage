import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
export function getStaticPaths(){return [{params:{lang:'zh'}},{params:{lang:'en'}}]}
export async function GET(context){
  const {lang}=context.params;
  const definitions=[['blog','writing'],['notes','notes'],['projects','projects'],['life','life']];
  const groups=await Promise.all(definitions.map(async([collection,section])=>{
    const entries=await getCollection(collection,({data})=>data.lang===lang&&!data.draft);
    return entries.map(entry=>({entry,section}));
  }));
  const items=groups.flat().sort((a,b)=>b.entry.data.pubDate.valueOf()-a.entry.data.pubDate.valueOf());
  const base=import.meta.env.BASE_URL.replace(/\/$/,'');
  const feedSite=new URL(`${base}/`,context.site);
  const feedUrl=new URL(`${base}/${lang}/rss.xml`,context.site);
  const language=lang==='zh'?'zh-CN':'en-US';
  const lastBuildDate=items.reduce((latest,{entry})=>Math.max(latest,(entry.data.updatedDate??entry.data.pubDate).valueOf()),0);
  const discussionsUrl='https://github.com/Hillindigo/Homepage/discussions';
  return rss({
    title:lang==='zh'?'青山黛 · Hillindigo':'Hillindigo',
    description:lang==='zh'?'文章、笔记、项目与生活记录。':'Writing, notes, projects and observations from life.',
    site:feedSite,
    xmlns:{atom:'http://www.w3.org/2005/Atom',dc:'http://purl.org/dc/elements/1.1/'},
    customData:`<language>${language}</language><lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate><atom:link href="${feedUrl.href}" rel="self" type="application/rss+xml"/><dc:creator>Hillindigo</dc:creator>`,
    items:items.map(({entry,section})=>({title:entry.data.title,description:entry.data.description,pubDate:entry.data.pubDate,link:`${lang}/${section}/${entry.id.replace(`${lang}/`,'')}/`,categories:entry.data.tags,commentsUrl:discussionsUrl,customData:`<dc:creator>Hillindigo</dc:creator>`})),
  });
}
