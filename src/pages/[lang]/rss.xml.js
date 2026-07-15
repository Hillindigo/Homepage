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
  const feedSite=new URL(`${import.meta.env.BASE_URL.replace(/\/$/,'')}/`,context.site);
  return rss({
    title:lang==='zh'?'青山黛 · Hillindigo':'Hillindigo',
    description:lang==='zh'?'文章、笔记、项目与生活记录。':'Writing, notes, projects and observations from life.',
    site:feedSite,
    items:items.map(({entry,section})=>({title:entry.data.title,description:entry.data.description,pubDate:entry.data.pubDate,link:`${lang}/${section}/${entry.id.replace(`${lang}/`,'')}/`,categories:entry.data.tags})),
  });
}
