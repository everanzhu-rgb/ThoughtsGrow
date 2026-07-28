import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("build contains the incremental thinking library", async () => {
  const [layout, page, app, composer, home, map, heatmap, cabinet, training, activityApi, trashApi, knowledgeApi, materialsApi, materialFileApi, layoutApi, mergeApi, cabinetApi, digestApi, trainingReportsApi, aiApi, deepseek, hosting, migration, cinematicMigration, unifiedMigration, trainingReportMigration] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ThoughtLabApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/MarkdownComposer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/DynamicHome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/FrameworkMindMap.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ActivityHeatmap.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/CabinetPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TrainingHub.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/activity/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/trash/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/knowledge/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/materials/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/materials/file/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/framework-layout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/records/merge/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cabinet/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/training-digest/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/training-reports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ai/analyze/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/deepseek.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_furry_lorna_dane.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_cinematic_atlas.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0005_unified_thought_archive.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0006_training_report_library.sql", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/home-cinematic.webp", import.meta.url)),
  ]);

  assert.match(layout, /序理 · 增量化思维方法库/);
  assert.match(layout, /持续导入、融合、演化并应用/);
  assert.match(layout, /og\.png/);
  assert.match(page, /ThoughtLabApp/);
  assert.match(app, /观星台 · 体系全貌/);
  assert.match(app, /思维记录与知识输入/);
  assert.match(app, /仅保存，先到这里/);
  assert.match(app, /全部可选；留空会在初步分析后自动补充/);
  assert.match(app, /新增情境后按回车/);
  assert.match(app, /送入观照室/);
  assert.match(app, /标签（逗号分隔）/);
  assert.match(app, /观照室 · 体系分析/);
  assert.match(app, /年轮志 · 版本历史/);
  assert.match(app, /请引路人 · 使用指南/);
  assert.match(app, /归航页 · Home/);
  assert.match(app, /归藏处 · 回收站/);
  assert.match(home, /快速收藏/);
  assert.match(home, /300_000/);
  assert.match(home, /translation/);
  assert.match(home, /source/);
  assert.doesNotMatch(home, /<small>补丁<\/small>/);
  assert.match(map, /Ctrl\/⌘ \+ 滚轮缩放/);
  assert.match(map, /全屏展开/);
  assert.match(map, /保存布局/);
  assert.match(layoutApi, /frameworkNodePositions/);
  assert.match(heatmap, /heat-focus/);
  assert.match(cabinet, /拾光橱/);
  assert.match(cabinet, /图片已上传/);
  assert.match(cabinet, /aria-live="polite"/);
  assert.match(cabinet, /response\.json\(\)\.catch/);
  assert.match(cabinetApi, /inspirationFavorites/);
  assert.match(training, /记忆复盘/);
  assert.match(training, /今日三篇/);
  assert.match(training, /训练报告库/);
  assert.match(training, /存入训练报告库/);
  assert.match(training, /api\/materials/);
  assert.match(training, /reviewGrade/);
  assert.match(digestApi, /hacker-news\.firebaseio\.com/);
  assert.match(digestApi, /export\.arxiv\.org/);
  assert.match(digestApi, /feeds\.bbci\.co\.uk/);
  assert.match(digestApi, /trainingFocus/);
  assert.match(trainingReportsApi, /trainingReports/);
  assert.match(trainingReportMigration, /training_reports/);
  assert.match(mergeApi, /mergedFromJson/);
  assert.match(activityApi, /activityEvents/);
  assert.match(trashApi, /deleteAfter/);
  assert.match(migration, /framework_node_notes/);
  assert.match(app, /MarkdownComposer/);
  assert.match(composer, /ReactMarkdown/);
  assert.match(composer, /remarkMath/);
  assert.match(composer, /pdfjs-dist/);
  assert.match(composer, /word\/document\.xml/);
  assert.match(composer, /富文本/);
  assert.match(composer, /hiliteColor/);
  assert.match(composer, /插入图片/);
  assert.match(composer, /preservePastedLineBreaks/);
  assert.match(materialsApi, /sourceMaterials/);
  assert.match(materialsApi, /r\.jina\.ai/);
  assert.match(materialsApi, /summaryZh/);
  assert.match(materialFileApi, /Content-Disposition/);
  assert.match(materialsApi, /\}\)\.FILES/);
  assert.match(hosting, /"r2": "FILES"/);
  assert.match(cinematicMigration, /framework_node_positions/);
  assert.match(unifiedMigration, /legacy-import-/);
  assert.match(unifiedMigration, /cabinet_items/);
  assert.match(knowledgeApi, /knowledgeImports/);
  assert.match(aiApi, /deepSeekJson/);
  assert.match(aiApi, /rationale/);
  assert.match(aiApi, /basis/);
  assert.match(aiApi, /reasoningJourney/);
  assert.match(aiApi, /suggestedTags/);
  assert.match(deepseek, /DEEPSEEK_API_KEY/);
  assert.doesNotMatch(deepseek, /sk-[a-zA-Z0-9]{16,}/);
  assert.doesNotMatch(`${layout}\n${page}\n${app}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("records can be compiled into an editable cognitive base", async () => {
  const [basePage, integrationStudio, versionHistory, baseApi, integrationApi, integrationAi, analysisApi, baseContext, schema, migration, relationApi, recordRelations, relationMigration, app] = await Promise.all([
    readFile(new URL("../app/components/CognitiveBasePage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/IntegrationStudio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/BaseVersionHistory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/bases/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/integrations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ai/integrate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ai/analyze/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/base-context.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0007_cognitive_base_engine.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/record-relations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/RecordRelations.tsx", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0008_record_relations.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ThoughtLabApp.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(basePage, /新增领域基座/);
  assert.match(basePage, /认知模组/);
  assert.match(basePage, /可执行思维流程/);
  assert.match(basePage, /vertical/);
  assert.doesNotMatch(basePage, /开始实践这套流程/);
  assert.match(basePage, /建立双向关系/);
  assert.match(basePage, /create_record_link/);
  assert.match(basePage, /delete_record_link/);
  assert.match(integrationStudio, /融合工作台/);
  assert.match(integrationStudio, /镜像对照/);
  assert.match(integrationStudio, /接受补丁并发布新版本/);
  assert.match(versionHistory, /以此版本恢复/);
  assert.match(versionHistory, /删除版本/);
  assert.match(baseApi, /restore_version/);
  assert.match(baseApi, /snapshotJson/);
  assert.match(integrationApi, /recordNodeLinks/);
  assert.match(integrationApi, /publishSpace/);
  assert.match(integrationAi, /个人认知体系编译器/);
  assert.match(baseContext, /当前正式生效、可编辑的个人思维基座/);
  assert.match(baseContext, /activeAnalysisFlow/);
  assert.match(analysisApi, /activeBaseBrief/);
  assert.match(analysisApi, /顺序和 step 名称一字不改/);
  assert.match(schema, /baseSpaces/);
  assert.match(schema, /integrationProposals/);
  assert.match(migration, /meta-playbook/);
  assert.match(relationApi, /recordRelations/);
  assert.match(recordRelations, /与其他记录的关系/);
  assert.match(recordRelations, /亲自确认过的关系/);
  assert.match(relationMigration, /record_relations/);
  assert.match(app, /RecordRelations/);
  assert.match(app, /融入思维基座/);
  assert.doesNotMatch(app, /## 四、用思维标准逐项检查/);
});

test("growth atlas presents evidence and relationships without capability scoring", async () => {
  const [growth, heatmap, app] = await Promise.all([
    readFile(new URL("../app/components/GrowthOverview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ActivityHeatmap.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ThoughtLabApp.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(app, /GrowthOverview/);
  assert.match(heatmap, /activity-stats/);
  assert.match(growth, /最近，你的注意力落在哪里/);
  assert.match(growth, /可回到原文的证据/);
  assert.match(growth, /HIDDEN RELATIONS/);
  assert.match(growth, /建议合并/);
  assert.match(growth, /可能重复/);
  assert.match(growth, /观点张力/);
  assert.match(growth, /确认这条关系/);
  assert.match(growth, /api\/record-relations/);
  assert.match(growth, /onOpenRecord/);
  assert.doesNotMatch(growth, /综合能力|metric-card|stage-label/);
});

test("observatory is optional quick analysis and reports mirror the initial result", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../app/components/ThoughtLabApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /观照室 · QUICK ANALYSIS/);
  assert.match(app, /不会自动保存/);
  assert.match(app, /保存到关联记录/);
  assert.match(app, /保存为新思维记录/);
  assert.match(app, /不保留本次结果/);
  assert.match(app, /同一份整体理解、同一条可执行流程/);
  assert.match(app, /reportContent = analysisToMarkdown\(result/);
  assert.doesNotMatch(app, /flowPhase === "structure"/);
  assert.doesNotMatch(app, /flowPhase === "review"/);
  assert.match(app, /按初步分析重建/);
  assert.doesNotMatch(app, /带着新回答进入观照室/);
  assert.match(styles, /base-node-rail section \.base-add-node/);
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /word-break:keep-all/);
});
