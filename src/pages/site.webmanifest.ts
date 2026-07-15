import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return new Response(JSON.stringify({
    name: '青山黛 · Hillindigo',
    short_name: 'Hillindigo',
    description: '记录 AI Agent、软件工程、知识系统与生活。',
    start_url: `${base}/zh/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: '#050706',
    theme_color: '#050706',
    icons: [{ src: `${base}/images/avatar.png`, sizes: '462x462', type: 'image/png', purpose: 'any maskable' }],
  }), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } });
};
