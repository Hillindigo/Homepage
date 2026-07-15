# 青山黛 / Hillindigo

Hillindigo 的双语个人数字花园，使用 Astro 静态生成并部署到 GitHub Pages。

## 本地开发

```bash
npm install
npm run dev
```

生产验证：

```bash
npm run check
npm run build
npm run preview
```

Pagefind 搜索索引只会在 `npm run build` 后生成，因此全文搜索请使用生产预览验证。

## 内容目录

```text
src/content/blog/{zh,en}/       长文章
src/content/notes/{zh,en}/      短笔记
src/content/projects/{zh,en}/   项目案例
src/content/life/{zh,en}/       生活记录
```

每篇内容使用 Markdown 或 MDX，发布日期、语言、标签和草稿状态由 Frontmatter 管理。`draft: true` 的内容不会出现在构建结果中。

创建一篇默认处于草稿状态的新内容：

```bash
npm run new -- writing zh my-first-post "文章标题" "一句话摘要"
```

`--type` 支持 `writing`、`notes`、`projects`、`life`。正式发布前将文件中的 `draft` 改为 `false`。

## 可选服务

复制 `.env.example` 为 `.env` 后填写：

- `PUBLIC_GISCUS_REPO_ID`、`PUBLIC_GISCUS_CATEGORY_ID`：启用 GitHub Discussions 评论。
- `PUBLIC_GOATCOUNTER_ENDPOINT`：启用无后端访问统计，例如 `https://your-code.goatcounter.com`。

未填写时，对应脚本不会加载，不影响网站使用。

## 分支与部署

- `develop`：日常开发与内容更新。
- `main`：稳定发布分支；合并后由 `.github/workflows/deploy.yml` 自动构建并发布 GitHub Pages。

当前站点配置仍使用 `https://hillindigo.github.io/Homepage/`。切换自定义域名时，需要同步调整 `astro.config.mjs` 中的 `site` 和 `base`。
