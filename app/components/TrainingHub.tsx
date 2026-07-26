"use client";

import { useEffect, useMemo, useState } from "react";
import { RichTextView } from "./RichTextView";

type RecordItem = { id: string; title: string; content: string; summary: string; primaryIssue: string; importance: number; nextReviewAt?: string | null; reviewCount: number };
type DigestItem = { id: string; title: string; excerpt: string; url: string; source: string; domain: string; publishedAt: string; reason: string; trainingFocus: string };
type Analysis = { overview: string; strengths: string[]; gaps: string[]; nextStep: string; focusFinding: string; evidence: string; structure: Array<{ name: string; text: string }>; assessments: Array<{ element: string; standard: string; finding: string; evidence: string; confidence: string }>; reasoningJourney: Array<{ step: string; from: string; thoughtMove: string; to: string; framework: string; why: string }>; questions: Array<{ question: string; rationale: string; basis: string }> };
type TrainingReport = { id: string; title: string; source: string; sourceUrl: string; domain: string; articleExcerpt: string; reportContent: string; createdAt: string };

function reportMarkdown(article: DigestItem, result: Analysis) {
  const journey = result.reasoningJourney.map((item, index) => `### ${index + 1}. ${item.step}\n\n**起点：** ${item.from}\n\n**思考动作：** ${item.thoughtMove}\n\n**阶段结论：** ${item.to}\n\n**体系依据：** ${item.framework}\n\n**为何这样推进：** ${item.why}`).join("\n\n");
  const questions = result.questions.map((item, index) => `### 问题 ${index + 1}\n\n**${item.question}**\n\n**构建过程：** ${item.rationale}\n\n**依据：** ${item.basis}`).join("\n\n");
  return `# 训练分析 · ${article.title}\n\n> 来源：${article.source} · ${article.domain}\n\n[阅读原文](${article.url})\n\n## 材料简介\n\n${article.excerpt}\n\n## 体系整体分析\n\n${result.overview}\n\n## 一步一步理解这篇材料\n\n${journey}\n\n## 关键发现\n\n${result.focusFinding}\n\n> ${result.evidence}\n\n## 值得保留的地方\n\n${result.strengths.map((item) => `- ${item}`).join("\n")}\n\n## 需要继续检查的地方\n\n${result.gaps.map((item) => `- ${item}`).join("\n")}\n\n## 启发式问题与构建依据\n\n${questions}\n\n## 下一步训练\n\n${result.nextStep}`;
}

export function TrainingHub({ records, onAnalyze }: { records: RecordItem[]; onAnalyze(text: string, focus: string): void }) {
  const [mode, setMode] = useState<"memory" | "today">("memory");
  const [cursor, setCursor] = useState(0);
  const [digest, setDigest] = useState<DigestItem[]>([]);
  const [digestLoading, setDigestLoading] = useState(true);
  const [lensId, setLensId] = useState("");
  const [selectedDigest, setSelectedDigest] = useState(0);
  const [analyzingId, setAnalyzingId] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisText, setAnalysisText] = useState("");
  const [analysisArticle, setAnalysisArticle] = useState<DigestItem | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [reports, setReports] = useState<TrainingReport[]>([]);
  const [openReport, setOpenReport] = useState<TrainingReport | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const ranked = useMemo(() => [...records].sort((a, b) => { const overdueA = a.nextReviewAt && new Date(a.nextReviewAt) <= new Date() ? 10 : 0; const overdueB = b.nextReviewAt && new Date(b.nextReviewAt) <= new Date() ? 10 : 0; return (overdueB + b.importance * 2 - b.reviewCount) - (overdueA + a.importance * 2 - a.reviewCount); }), [records]);
  const recommended = ranked[cursor % Math.max(1, ranked.length)];

  useEffect(() => {
    fetch("/api/training-digest").then((response) => response.ok ? response.json() : null).then((data) => { if (data) setDigest(data.items || []); }).catch(() => undefined).finally(() => setDigestLoading(false));
    fetch("/api/training-reports").then((response) => response.ok ? response.json() : null).then((data) => setReports(data?.reports || [])).catch(() => undefined);
  }, []);

  async function grade(value: "again" | "hard" | "good" | "easy") { if (!recommended) return; await fetch("/api/records", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: recommended.id, action: "review", reviewGrade: value }) }); setCursor((current) => current + 1); }

  async function analyzeDigest(index: number) {
    const article = digest[index]; if (!article || analyzingId) return;
    setSelectedDigest(index); setAnalysisArticle(article); setAnalysis(null); setAnalysisText(""); setAnalysisError(""); setSaveMessage(""); setAnalyzingId(article.id);
    try {
      let fullText = article.excerpt;
      const materialResponse = await fetch("/api/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: article.url }) });
      if (materialResponse.ok) {
        const materialData = (await materialResponse.json()) as { material?: { extractedText?: string } };
        if (materialData.material?.extractedText) fullText = materialData.material.extractedText;
      }
      const lens = records.find((record) => record.id === lensId);
      const text = lens ? `【要应用的既有思维记录】\n标题：${lens.title}\n重点：${lens.summary || lens.primaryIssue}\n原文：${lens.content}\n\n【今日完整材料】\n标题：${article.title}\n出处：${article.source}\n链接：${article.url}\n正文：\n${fullText.slice(0, 18000)}\n\n请先复原既有记录的重点与推理方式，再把它作为透镜应用到材料，并检查这副透镜的盲区。` : `标题：${article.title}\n出处：${article.source}\n链接：${article.url}\n训练重点：${article.trainingFocus}\n正文：\n${fullText.slice(0, 20000)}`;
      const response = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, focus: lens ? `应用记录“${lens.title}”作为分析透镜` : article.trainingFocus, scene: `训练专题 · ${article.domain}` }) });
      const data = (await response.json()) as { result?: Analysis; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error || "体系分析失败");
      setAnalysis(data.result); setAnalysisText(reportMarkdown(article, data.result));
      window.setTimeout(() => document.getElementById("daily-analysis-report")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (error) { setAnalysisError(error instanceof Error ? error.message : "读取并分析材料失败"); }
    finally { setAnalyzingId(""); }
  }

  async function saveTrainingReport() {
    if (!analysisArticle || !analysis || !analysisText) return;
    setSaveMessage("正在归档…");
    const response = await fetch("/api/training-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: analysisArticle.title, source: analysisArticle.source, sourceUrl: analysisArticle.url, domain: analysisArticle.domain, articleExcerpt: analysisArticle.excerpt, reportContent: analysisText, analysis }) });
    const data = (await response.json().catch(() => null)) as { report?: TrainingReport; error?: string } | null;
    if (!response.ok || !data?.report) { setSaveMessage(data?.error || "保存失败，请稍后重试"); return; }
    setReports((items) => [data.report!, ...items]); setSaveMessage("已收入训练报告库");
  }

  async function removeReport(id: string) {
    const response = await fetch("/api/training-reports", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok) { setReports((items) => items.filter((item) => item.id !== id)); if (openReport?.id === id) setOpenReport(null); }
  }

  return <div className="training-hub"><header className="training-hub-head"><span className="eyebrow">DUAL PRACTICE · 训练专题</span><h1 className="gothic-display-title">The<br /><span>Crucible</span></h1><p>一种训练让重要记录在该回来时回来；另一种训练把今天的新材料放上思维基座，练习真实判断。</p><div className="training-mode-switch"><button className={mode === "memory" ? "active" : ""} onClick={() => setMode("memory")}><span>01</span><strong>记忆复盘</strong><small>基于间隔与个人证据</small></button><button className={mode === "today" ? "active" : ""} onClick={() => setMode("today")}><span>02</span><strong>今日三篇</strong><small>论文、新闻与公共讨论</small></button></div></header>
    {mode === "memory" ? <section className="memory-practice card">{recommended ? <><div className="memory-reason"><span>为什么今天推荐它</span><p>{recommended.nextReviewAt && new Date(recommended.nextReviewAt) <= new Date() ? "它已经到达计划复习时间；" : "它尚未过期，但在当前档案中优先级较高；"}重要性为 {recommended.importance} 星，已复习 {recommended.reviewCount} 次。系统优先选择“重要、间隔已到、复习证据较少”的记录。</p></div><div className="memory-card"><small>RECALL WITHOUT LOOKING</small><h2>{recommended.title}</h2><p>先不打开原文：你还记得它最重要的结论、依据和一个可能的反例吗？</p><details><summary>翻开记录</summary><blockquote>{recommended.content}</blockquote><p>{recommended.summary}</p></details></div><div className="memory-actions"><button onClick={() => void grade("again")}>忘记了 · 明天</button><button onClick={() => void grade("hard")}>有点难 · 3 天</button><button onClick={() => void grade("good")}>记得 · 7 天</button><button onClick={() => void grade("easy")}>很熟 · 21 天</button></div><footer><button onClick={() => setCursor((value) => value + 1)}>跳过 / 换一条</button><button onClick={() => onAnalyze(recommended.content, recommended.primaryIssue || "整体分析")}>送入观照室深度复盘 →</button></footer></> : <p>先创建一条思维记录，系统才能为你安排复习。</p>}</section>
    : <section className="today-practice">{digestLoading && <div className="card digest-loading">正在从今日公开来源取回材料…</div>}{!digestLoading && digest.length === 0 && <div className="card digest-loading">今天的外部来源暂时没有可用内容，请稍后刷新。</div>}<div className="digest-grid">{digest.map((item, index) => <article className={`digest-card card ${selectedDigest === index ? "active" : ""}`} key={item.id} onClick={() => void analyzeDigest(index)}><div className="digest-card-meta"><span>{item.domain}</span><small>{new Date(item.publishedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</small></div><h2>{item.title}</h2><div className="digest-card-summary"><span>简介</span><p>{item.excerpt}</p></div><footer><div><strong>选择理由</strong><p>{item.reason}</p></div><div><strong>训练重点</strong><p>{item.trainingFocus}</p></div><a href={item.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>阅读原文 ↗</a></footer>{analyzingId === item.id && <span className="digest-analyzing">正在读取全文并用体系分析…</span>}</article>)}</div>
      {digest.length > 0 && <div className="lens-application card"><div><span className="eyebrow">APPLY A LENS</span><h2>点击任一看板，体系会自动阅读并分析</h2><p>默认使用完整体系。也可以先选择一条既有记录，把它作为额外分析透镜。</p></div><label>可选：应用一条既有思维记录<select value={lensId} onChange={(event) => setLensId(event.target.value)}><option value="">只做完整体系分析</option>{records.map((record) => <option value={record.id} key={record.id}>{record.title}</option>)}</select></label><button className="ghost-button" onClick={() => void analyzeDigest(selectedDigest)}>重新分析所选看板</button></div>}
      {(analysisError || analysisText) && <section id="daily-analysis-report" className="card daily-analysis-report">{analysisError ? <p className="form-warning">{analysisError}</p> : <><header><div><span className="eyebrow">LIVE SYSTEM ANALYSIS</span><h2>{analysisArticle?.title}</h2><p>报告暂时只在当前页面显示，由你决定是否归档。</p></div><div><button className="primary-button" onClick={() => void saveTrainingReport()}>存入训练报告库</button>{saveMessage && <small>{saveMessage}</small>}</div></header><RichTextView>{analysisText}</RichTextView></>}</section>}
      <section className="training-report-library"><div className="training-library-head"><div><span className="eyebrow">TRAINING ARCHIVE</span><h2>训练报告库</h2><p>只有你主动选择保存的分析，才会留在这里。</p></div><strong>{reports.length.toString().padStart(2, "0")}</strong></div>{reports.length === 0 ? <div className="card empty-training-library">还没有归档的训练报告。点击上方任一看板完成分析后，可以选择保存。</div> : <div className="training-report-grid">{reports.map((report) => <article className="card" key={report.id}><span>{report.domain}</span><h3>{report.title}</h3><p>{report.articleExcerpt}</p><footer><button onClick={() => setOpenReport(report)}>打开报告</button><button aria-label="删除训练报告" onClick={() => void removeReport(report.id)}>⌫</button></footer></article>)}</div>}</section>
      {openReport && <div className="modal-backdrop" role="presentation"><section className="card training-report-modal" role="dialog" aria-modal="true" aria-label="训练分析报告"><button className="modal-close" onClick={() => setOpenReport(null)} aria-label="关闭">×</button><span className="eyebrow">SAVED TRAINING REPORT</span><h2>{openReport.title}</h2><p><a href={openReport.sourceUrl} target="_blank" rel="noreferrer">{openReport.source} · 阅读原文 ↗</a></p><RichTextView>{openReport.reportContent}</RichTextView></section></div>}
    </section>}
  </div>;
}
