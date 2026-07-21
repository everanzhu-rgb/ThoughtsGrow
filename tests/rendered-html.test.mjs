import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("build contains the incremental thinking library", async () => {
  const [layout, page, app, composer, knowledgeApi, materialsApi, aiApi, deepseek, hosting] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ThoughtLabApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/MarkdownComposer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/knowledge/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/materials/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ai/analyze/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/deepseek.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
  ]);

  assert.match(layout, /序理 · 增量化思维方法库/);
  assert.match(layout, /持续导入、融合、演化并应用/);
  assert.match(layout, /og\.png/);
  assert.match(page, /ThoughtLabApp/);
  assert.match(app, /观星台 · 体系全貌/);
  assert.match(app, /拾穗门 · 知识导入/);
  assert.match(app, /观照室 · 体系分析/);
  assert.match(app, /年轮志 · 版本历史/);
  assert.match(app, /请引路人 · 使用指南/);
  assert.match(app, /MarkdownComposer/);
  assert.match(composer, /ReactMarkdown/);
  assert.match(composer, /remarkMath/);
  assert.match(composer, /pdfjs-dist/);
  assert.match(composer, /word\/document\.xml/);
  assert.match(materialsApi, /sourceMaterials/);
  assert.match(materialsApi, /\}\)\.FILES/);
  assert.match(hosting, /"r2": "FILES"/);
  assert.match(knowledgeApi, /knowledgeImports/);
  assert.match(aiApi, /deepSeekJson/);
  assert.match(deepseek, /DEEPSEEK_API_KEY/);
  assert.doesNotMatch(deepseek, /sk-[a-zA-Z0-9]{16,}/);
  assert.doesNotMatch(`${layout}\n${page}\n${app}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
