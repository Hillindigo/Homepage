# 青山黛 / Hillindigo

Hillindigo 的双语个人数字花园，使用 Astro 静态生成并部署到 GitHub Pages。

## 本地开发

```bash
npm install
npm run dev
```

预览尚未发布的草稿：

```bash
npm run dev:drafts
```

草稿模式仅在 Astro 开发服务器中生效；`npm run build` 与 GitHub Pages 部署始终排除 `draft: true` 的内容。

生产验证：

```bash
npm run validate
```

该命令会依次检查内容 Frontmatter 与双语对应关系、Astro 类型、生产构建以及全部站内链接。验证通过后可使用 `npm run preview` 查看最终产物。

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

中英文草稿准备完成后，可以按共用的 `translationKey` 同时发布：

```bash
npm run publish -- writing my-first-post --dry-run
npm run publish -- writing my-first-post
```

发布命令会在修改文件前检查中英文是否都存在、是否同为草稿、是否填写标签与正文。`--dry-run` 只显示即将发布的文件，不会改动内容。发布后运行 `npm run validate` 再提交。

## 可选服务

复制 `.env.example` 为 `.env` 后填写：

- `PUBLIC_GISCUS_REPO_ID`、`PUBLIC_GISCUS_CATEGORY_ID`：安装 [Giscus App](https://github.com/apps/giscus) 后启用 GitHub Discussions 内嵌评论；本仓库的公开 ID 已写入示例文件。
- `PUBLIC_GOATCOUNTER_ENDPOINT`：启用无后端访问统计，例如 `https://your-code.goatcounter.com`。

未填写时，对应脚本不会加载，不影响网站使用。

GitHub Pages 部署时，请在仓库 `Settings → Secrets and variables → Actions → Variables` 中创建同名变量。部署工作流会自动将它们传给 Astro 构建过程；没有配置时仍会显示可直接访问的 Discussions 入口。

## 分支与部署

- `develop`：日常开发与内容更新。
- `main`：稳定发布分支；合并后由 `.github/workflows/deploy.yml` 自动构建并发布 GitHub Pages。

当前站点使用自定义域名 `https://hillindigo.cc.cd/`；GitHub Pages 的项目路径 `/Homepage` 不再出现在公开网址中。
