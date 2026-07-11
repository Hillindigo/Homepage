import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
export function getStaticPaths(){return [{params:{lang:'zh'}},{params:{lang:'en'}}]}
export async function GET(context){const {lang}=context.params;const posts=await getCollection('blog',({data})=>data.lang===lang&&!data.draft);return rss({title:lang==='zh'?'青山黛 · 文章':'Hillindigo · Writing',description:lang==='zh'?'记录技术、工具与生活。':'Writing on technology, tools and life.',site:context.site,items:posts.map(post=>({title:post.data.title,description:post.data.description,pubDate:post.data.pubDate,link:`${lang}/writing/${post.id.replace(`${lang}/`,'')}/`,categories:post.data.tags}))});}
