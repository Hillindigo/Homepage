import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const shared = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  lang: z.enum(['zh', 'en']),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
  translationKey: z.string().optional(),
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: shared.extend({ cover: z.string().optional() }),
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: shared,
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: shared.extend({
    year: z.number(),
    status: z.enum(['active', 'completed', 'archived']).default('active'),
    stack: z.array(z.string()).default([]),
    repository: z.url().optional(),
    website: z.url().optional(),
  }),
});

const life = defineCollection({
  loader: glob({ base: './src/content/life', pattern: '**/*.{md,mdx}' }),
  schema: shared.extend({
    kind: z.enum(['reading', 'photography', 'journal', 'travel']).default('journal'),
    location: z.string().optional(),
    cover: z.string().optional(),
  }),
});

export const collections = { blog, notes, projects, life };
