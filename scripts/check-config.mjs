import { readFile } from 'node:fs/promises';
import process from 'node:process';

async function loadLocalEnv() {
  let source = '';
  try { source = await readFile('.env', 'utf8'); } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  }
}

await loadLocalEnv();

const repoId = process.env.PUBLIC_GISCUS_REPO_ID?.trim() ?? '';
const categoryId = process.env.PUBLIC_GISCUS_CATEGORY_ID?.trim() ?? '';
const goatcounter = process.env.PUBLIC_GOATCOUNTER_ENDPOINT?.trim() ?? '';
const problems = [];

if (Boolean(repoId) !== Boolean(categoryId)) {
  problems.push('PUBLIC_GISCUS_REPO_ID and PUBLIC_GISCUS_CATEGORY_ID must be configured together');
}
if (repoId && !/^R_[A-Za-z0-9_-]+$/.test(repoId)) {
  problems.push('PUBLIC_GISCUS_REPO_ID must be a GitHub repository node ID beginning with R_');
}
if (categoryId && !/^DIC_[A-Za-z0-9_-]+$/.test(categoryId)) {
  problems.push('PUBLIC_GISCUS_CATEGORY_ID must be a Discussions category node ID beginning with DIC_');
}
if (goatcounter) {
  try {
    const url = new URL(goatcounter);
    if (url.protocol !== 'https:') problems.push('PUBLIC_GOATCOUNTER_ENDPOINT must use HTTPS');
  } catch {
    problems.push('PUBLIC_GOATCOUNTER_ENDPOINT must be a valid absolute URL');
  }
}

if (problems.length > 0) {
  console.error(`Configuration validation failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Optional services: comments ${repoId ? 'configured' : 'fallback'}, analytics ${goatcounter ? 'configured' : 'disabled'}.`);
