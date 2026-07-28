"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { MarkdownComposer } from "./MarkdownComposer";
import { DynamicHome } from "./DynamicHome";
import { FrameworkMindMap } from "./FrameworkMindMap";
import { GrowthOverview } from "./GrowthOverview";
import { RichTextView } from "./RichTextView";
import { TrainingHub } from "./TrainingHub";
import { CabinetPage } from "./CabinetPage";
import { CognitiveBasePage, type BaseSpace } from "./CognitiveBasePage";
import { IntegrationStudio } from "./IntegrationStudio";
import { BaseVersionHistory } from "./BaseVersionHistory";
import { RecordRelations } from "./RecordRelations";
import { PageAtmosphere } from "./PageAtmosphere";

type PageKey =
  | "dashboard"
  | "records"
  | "new"
  | "growth"
  | "topics"
  | "knowledge"
  | "framework"
  | "history"
  | "analyze"
  | "trash"
  | "cabinet"
  | "integration";

type FlowPhase =
  | "compose"
  | "saving"
  | "assessment";

type RecordFolder = { id: string; name: string; parentId?: string | null };
type RecordFolderLink = { id: string; folderId: string; recordId: string };
const RECENT_RECORD_CUTOFF = Date.now() - 30 * 86400000;

type FrameworkEditorKind =
  | "version"
  | "elements"
  | "standards"
  | "relations"
  | "capability";

type StoredRecord = {
  id: string;
  title: string;
  content: string;
  scene: string;
  mode: string;
  status: string;
  summary: string;
  primaryIssue: string;
  source: string;
  sourceUrl: string;
  note: string;
  tagsJson: string;
  importance: number;
  annotationsJson: string;
  analysisReportJson: string;
  reportContent: string;
  nextReviewAt?: string | null;
  reviewCount: number;
  mergedFromJson: string;
  frameworkVersion: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  deleteAfter?: string | null;
};

type FrameworkVersion = {
  id: string;
  name: string;
  version: string;
  description: string;
  definitionJson: string;
  status: string;
  createdAt: string;
};

type ImportAnalysis = {
  coverage: "covered" | "extension";
  target: string;
  recommendation: string;
  essence: string;
  overlaps?: string[];
  novelty?: string;
  integrationPlan?: string[];
};

type ModelAnalysis = {
  overview: string;
  strengths: string[];
  gaps: string[];
  nextStep: string;
  focusTitle: string;
  focusFinding: string;
  evidence: string;
  questions: Array<{ question: string; rationale: string; basis: string }>;
  reasoningJourney: Array<{ step: string; from: string; thoughtMove: string; to: string; framework: string; why: string }>;
  suggestedTitle: string;
  suggestedScene: string;
  suggestedTags: string[];
  suggestedNote: string;
  structure: Array<{ name: string; text: string }>;
  assessments: Array<{ element: string; standard: string; finding: string; evidence: string; confidence: string }>;
};

type KnowledgeImport = {
  id: string;
  content: string;
  source: string;
  note: string;
  analysisJson: string;
  disposition: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  deleteAfter?: string | null;
};

const navItems: Array<{ id: PageKey; label: string; symbol: string }> = [
  { id: "dashboard", label: "归航页 · Home", symbol: "⌂" },
  { id: "framework", label: "观星台 · 体系全貌", symbol: "✦" },
  { id: "analyze", label: "观照室 · 体系分析", symbol: "◉" },
  { id: "history", label: "年轮志 · 版本历史", symbol: "◷" },
  { id: "records", label: "行思录 · 思维记录", symbol: "≡" },
  { id: "growth", label: "生长谱 · 成长分析", symbol: "↗" },
  { id: "topics", label: "磨砺场 · 训练专题", symbol: "◎" },
  { id: "cabinet", label: "拾光橱 · 我的收藏", symbol: "♢" },
  { id: "new", label: "落笔 · 新建记录", symbol: "+" },
  { id: "trash", label: "归藏处 · 回收站", symbol: "⌫" },
];

const qualityScores = [
  { name: "清晰性", score: 82, change: 5 },
  { name: "准确性", score: 74, change: 2 },
  { name: "精确性", score: 68, change: 3 },
  { name: "相关性", score: 84, change: 4 },
  { name: "深度", score: 71, change: 6 },
  { name: "广度", score: 61, change: -1 },
  { name: "逻辑性", score: 79, change: 4 },
  { name: "重要性", score: 77, change: 3 },
  { name: "公正性", score: 66, change: 2 },
];

const elements = [
  { name: "目的", level: 88, note: "通常能保持目标意识" },
  { name: "问题", level: 84, note: "核心问题识别稳定" },
  { name: "信息", level: 72, note: "开始主动区分证据类型" },
  { name: "解释与推理", level: 79, note: "推理链条较完整" },
  { name: "概念", level: 68, note: "偶尔使用模糊概念" },
  { name: "假设", level: 52, note: "较少主动识别隐含前提" },
  { name: "结果与意义", level: 58, note: "长期后果考虑不足" },
  { name: "观点", level: 63, note: "反方视角仍需练习" },
];

const capabilities = [
  { name: "批判性思维", score: 74, delta: 3 },
  { name: "逻辑推理", score: 79, delta: 4 },
  { name: "问题分析", score: 77, delta: 5 },
  { name: "决策能力", score: 69, delta: 2 },
  { name: "反思能力", score: 81, delta: 6 },
];

const sampleRecords: StoredRecord[] = [
  {
    id: "sample-1",
    title: "是否应该调整研究方向？",
    content:
      "我在比较继续当前方向和转向新方法的利弊。现有方向积累更多，但新方法可能更有解释力。我倾向于先做一个小规模验证。",
    scene: "重要决策",
    mode: "review",
    status: "trained",
    summary: "比较两条研究路径，并以小规模验证降低转换风险。",
    primaryIssue: "对反方证据考虑不足",
    source: "个人决策记录", sourceUrl: "", note: "先验证，再决定是否转向。", tagsJson: "[\"研究\",\"决策\"]", importance: 5, annotationsJson: "[]", analysisReportJson: "{}", reportContent: "", reviewCount: 1, mergedFromJson: "[]",
    frameworkVersion: "Critical Thinking Base V1.0",
    createdAt: "2026-07-18T11:20:00.000Z",
  },
  {
    id: "sample-2",
    title: "读《思考，快与慢》后的一个疑问",
    content: "关于直觉判断与分析判断的阅读记录。",
    scene: "听课与阅读",
    mode: "record",
    status: "analyzed",
    summary: "将书中的双系统框架与自己的决策经验联系起来。",
    primaryIssue: "概念边界不够精确",
    source: "《思考，快与慢》", sourceUrl: "", note: "", tagsJson: "[\"阅读\",\"认知\"]", importance: 4, annotationsJson: "[]", analysisReportJson: "{}", reportContent: "", reviewCount: 0, mergedFromJson: "[]",
    frameworkVersion: "Critical Thinking Base V1.0",
    createdAt: "2026-07-16T20:10:00.000Z",
  },
  {
    id: "sample-3",
    title: "一次讨论中的误解从哪里开始",
    content: "复盘一段讨论，发现双方对“有效”的定义并不一致。",
    scene: "日常聊天",
    mode: "record",
    status: "saved",
    summary: "识别到分歧来自概念定义，而不只是立场差异。",
    primaryIssue: "关键概念未先澄清",
    source: "", sourceUrl: "", note: "", tagsJson: "[\"沟通\"]", importance: 3, annotationsJson: "[]", analysisReportJson: "{}", reportContent: "", reviewCount: 0, mergedFromJson: "[]",
    frameworkVersion: "Critical Thinking Base V1.0",
    createdAt: "2026-07-14T22:35:00.000Z",
  },
];

const problems = [
  {
    name: "只考虑单一观点",
    count: 4,
    pair: "观点 × 广度",
    last: "2 天前",
    trend: "训练中",
  },
  {
    name: "隐含假设未被验证",
    count: 3,
    pair: "假设 × 深度",
    last: "5 天前",
    trend: "需关注",
  },
  {
    name: "概念定义不够具体",
    count: 2,
    pair: "概念 × 精确性",
    last: "6 天前",
    trend: "改善中",
  },
];

const topics = [
  {
    name: "构建最强反方观点",
    focus: "观点 × 广度",
    sessions: 5,
    progress: 62,
    note: "从寻找反例，进阶到完整重构对方论证。",
  },
  {
    name: "识别隐含假设",
    focus: "假设 × 深度",
    sessions: 3,
    progress: 44,
    note: "练习找出结论成立所依赖、但没有明说的条件。",
  },
  {
    name: "证据质量判断",
    focus: "信息 × 准确性",
    sessions: 7,
    progress: 76,
    note: "区分事实、推测、经验、直觉与待验证信息。",
  },
];

const sceneOptions = ["日常思考", "听课与阅读", "重要决策", "每日复盘", "日常聊天", "学术讨论"];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function RadarChart() {
  const center = 150;
  const radius = 104;
  const points = qualityScores.map((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / qualityScores.length;
    const r = (item.score / 100) * radius;
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  });
  const rings = [0.25, 0.5, 0.75, 1];
  const ringPoints = (scale: number) =>
    qualityScores
      .map((_, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / qualityScores.length;
        return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
      })
      .join(" ");

  return (
    <div className="radar-wrap" aria-label="九项思维标准雷达图">
      <svg viewBox="0 0 300 300" role="img">
        {rings.map((ring) => (
          <polygon key={ring} points={ringPoints(ring)} className="radar-ring" />
        ))}
        {qualityScores.map((item, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / qualityScores.length;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          const labelX = center + Math.cos(angle) * (radius + 28);
          const labelY = center + Math.sin(angle) * (radius + 28);
          return (
            <g key={item.name}>
              <line x1={center} y1={center} x2={x} y2={y} className="radar-axis" />
              <text x={labelX} y={labelY} className="radar-label">
                {item.name}
              </text>
            </g>
          );
        })}
        <polygon points={points.join(" ")} className="radar-area" />
        {points.map((point, index) => {
          const [cx, cy] = point.split(",");
          return <circle key={index} cx={cx} cy={cy} r="3.5" className="radar-dot" />;
        })}
      </svg>
      <div className="radar-center">
        <strong>74</strong>
        <span>稳定水平</span>
      </div>
    </div>
  );
}

function GrowthChart({ large = false, range = 30, byDay = {} }: { large?: boolean; range?: number; byDay?: Record<string, Array<{ kind: string; summary: string; at: string }>> }) {
  const dates = Array.from({ length: range }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (range - 1 - index)); return date;
  });
  const bucketSize = Math.max(1, Math.ceil(range / 12));
  let evidence = 0;
  const points = dates.filter((_, index) => index % bucketSize === 0 || index === dates.length - 1).map((date, index, list) => {
    const start = Math.min(index * bucketSize, dates.length - 1);
    const end = Math.min(start + bucketSize, dates.length);
    const activity = dates.slice(start, end).reduce((sum, item) => sum + (byDay[item.toISOString().slice(0, 10)]?.length || 0), 0);
    evidence += Math.min(3, activity);
    const maturity = Math.min(3.55, 0.55 + Math.log2(1 + evidence) * 0.68);
    const x = list.length === 1 ? 360 : 12 + index * (696 / (list.length - 1));
    const y = 205 - maturity * 48;
    return { x, y, activity, date };
  });
  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaString = `12,214 ${pointString} 708,214`;
  const labelDates = [dates[0], dates[Math.floor((dates.length - 1) / 2)], dates[dates.length - 1]];
  return (
    <div className={`growth-chart ${large ? "growth-chart-large" : ""}`}>
      <div className="chart-ylabels" aria-hidden="true">
        <span>稳定</span>
        <span>成形</span>
        <span>萌芽</span>
        <span>起点</span>
      </div>
      <svg viewBox="0 0 720 230" preserveAspectRatio="none" role="img" aria-label={`最近 ${range} 天的证据成熟度轨迹`}>
        <line x1="0" y1="28" x2="720" y2="28" className="grid-line" />
        <line x1="0" y1="82" x2="720" y2="82" className="grid-line" />
        <line x1="0" y1="136" x2="720" y2="136" className="grid-line" />
        <line x1="0" y1="190" x2="720" y2="190" className="grid-line" />
        <polygon points={areaString} className="chart-area" />
        <polyline points={pointString} className="stable-line" />
        {points.map((point) => <circle key={`${point.x}-${point.date.toISOString()}`} cx={point.x} cy={point.y} r={point.activity ? "5" : "3"} className="stable-point" />)}
      </svg>
      <div className="chart-xlabels">
        {labelDates.map((date, index) => <span key={index}>{index === labelDates.length - 1 ? "今天" : date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span>)}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  note,
  action,
}: {
  eyebrow?: string;
  title: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {action}
    </div>
  );
}

function analysisToMarkdown(result: ModelAnalysis, focus: string) {
  const journey = result.reasoningJourney.map((item, index) => `### ${index + 1}. ${item.step}\n\n**从哪里出发：** ${item.from}\n\n**做了什么思考动作：** ${item.thoughtMove}\n\n**走到了哪里：** ${item.to}\n\n**使用的体系：** ${item.framework}\n\n**为什么这一步成立：** ${item.why}`).join("\n\n");
  const structureText = result.structure.map((item) => `### ${item.name}\n\n${item.text}`).join("\n\n");
  const questions = result.questions.map((item, index) => `### 问题 ${index + 1}\n\n**${item.question}**\n\n#### 这个问题是怎样一步步构建出来的？\n\n${item.rationale}\n\n#### 构建依据\n\n${item.basis}\n\n#### 你可以怎样仿照？\n\n先圈出原文中尚未说明、彼此冲突或证据薄弱的地方，再选择对应的思维元素与标准，确定希望自己完成的认知动作，最后把宽泛的“为什么”收窄为一个能用证据回答的问题。`).join("\n\n");
  return `# 初步分析报告\n\n> 这份报告就是初步分析页面的完整归档：同一份整体理解、同一条可执行流程、同一组转折点与启发式问题，不进行第二次改写。\n\n## 一、先抓住它真正想说什么\n\n${result.overview}\n\n## 二、沿当前可执行流程，一步一步走到本质\n\n${journey}\n\n## 三、理解发生转折的地方\n\n### 已经站得住的部分\n\n${result.strengths.map((item) => `- ${item}`).join("\n")}\n\n### 还不能轻易跨过去的部分\n\n${result.gaps.map((item) => `- ${item}`).join("\n")}\n\n### 下一步最小行动\n\n${result.nextStep}\n\n## 四、启发式问题，以及问题是怎样长出来的\n\n${questions}\n\n## 五、本次聚焦 · ${focus}\n\n${result.focusFinding}\n\n> 直接依据：${result.evidence}\n\n## 六、已确认的思考结构\n\n${structureText}\n\n## 七、准备进入个人思维基座\n\n可以进入“融合工作台”，判断这条记录应当修改元认知基座、领域基座，或同时影响两者。正式体系不会被自动改写。`;
}

export function ThoughtLabApp() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [records, setRecords] = useState<StoredRecord[]>(sampleRecords);
  const [selectedRecord, setSelectedRecord] = useState<StoredRecord | null>(null);
  const [integrationRecord, setIntegrationRecord] = useState<StoredRecord | null>(null);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("compose");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scene, setScene] = useState("");
  const [sceneChoices, setSceneChoices] = useState(sceneOptions);
  const [sceneDraft, setSceneDraft] = useState("");
  const [recordSource, setRecordSource] = useState("");
  const [recordSourceUrl, setRecordSourceUrl] = useState("");
  const [recordNote, setRecordNote] = useState("");
  const [recordTags, setRecordTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [recordImportance, setRecordImportance] = useState(3);
  const [savedId, setSavedId] = useState("");
  const [saveWarning, setSaveWarning] = useState("");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [knowledgeText, setKnowledgeText] = useState("");
  const [knowledgeAnalyzed, setKnowledgeAnalyzed] = useState(false);
  const [knowledgeSource, setKnowledgeSource] = useState("");
  const [knowledgeNote, setKnowledgeNote] = useState("");
  const [knowledgeImports, setKnowledgeImports] = useState<KnowledgeImport[]>([]);
  const [currentImport, setCurrentImport] = useState<KnowledgeImport | null>(null);
  const [currentImportAnalysis, setCurrentImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [knowledgeMessage, setKnowledgeMessage] = useState("");
  const [frameworkVersions, setFrameworkVersions] = useState<FrameworkVersion[]>([]);
  const [historySelected, setHistorySelected] = useState<FrameworkVersion | null>(null);
  const [analysisText, setAnalysisText] = useState("");
  const [analysisFocus, setAnalysisFocus] = useState("整体分析");
  const [analysisBaseId, setAnalysisBaseId] = useState("meta-core");
  const [analysisBases, setAnalysisBases] = useState<BaseSpace[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisRecordId, setAnalysisRecordId] = useState("");
  const [analysisSaveState, setAnalysisSaveState] = useState<"" | "saving" | "saved">("");
  const [modelAnalysis, setModelAnalysis] = useState<ModelAnalysis | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState("");
  const [recordQuery, setRecordQuery] = useState("");
  const [recordFilter, setRecordFilter] = useState<"all" | "integrated" | "trained" | "review" | "saved">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [starFilter, setStarFilter] = useState(0);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [mergeTitle, setMergeTitle] = useState("");
  const [utilityPanel, setUtilityPanel] = useState<"notifications" | "settings" | null>(null);
  const [customTopics, setCustomTopics] = useState<Array<(typeof topics)[number] & { id?: string }>>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<"start" | "import" | "analyze" | "evolve">("start");
  const [frameworkEditor, setFrameworkEditor] = useState<{
    kind: FrameworkEditorKind;
    label: string;
  } | null>(null);
  const [frameworkDraftTitle, setFrameworkDraftTitle] = useState("");
  const [frameworkDraftBody, setFrameworkDraftBody] = useState("");
  const [versionName, setVersionName] = useState("V1.1");
  const [versionNote, setVersionNote] = useState("增加对不确定性表达的观察说明。");
  const [versionSaved, setVersionSaved] = useState(false);
  const [frameworkSaveError, setFrameworkSaveError] = useState("");
  const [activityByDay, setActivityByDay] = useState<Record<string, Array<{ kind: string; summary: string; at: string }>>>({});
  const [usageByDay, setUsageByDay] = useState<Record<string, number>>({});
  const [totalUsageSeconds, setTotalUsageSeconds] = useState(0);
  const [editingRecord, setEditingRecord] = useState<StoredRecord | null>(null);
  const [editingTarget, setEditingTarget] = useState<"record" | "report">("record");
  const [annotationDraft, setAnnotationDraft] = useState("");
  const [editingImport, setEditingImport] = useState<KnowledgeImport | null>(null);
  const [trashRecords, setTrashRecords] = useState<StoredRecord[]>([]);
  const [trashImports, setTrashImports] = useState<KnowledgeImport[]>([]);
  const [recordFolders, setRecordFolders] = useState<RecordFolder[]>([]);
  const [recordFolderLinks, setRecordFolderLinks] = useState<RecordFolderLink[]>([]);
  const [activeFolderId, setActiveFolderId] = useState("all");
  const [sceneryFocus, setSceneryFocus] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("xuli-scene-tags") || "[]") as string[];
      if (saved.length) queueMicrotask(() => setSceneChoices(saved));
      const storedFocus = Number(window.localStorage.getItem("xuli:scenery-focus:v1"));
      if (storedFocus >= 0 && storedFocus <= 100) queueMicrotask(() => setSceneryFocus(storedFocus));
    } catch { /* Keep the built-in scene tags. */ }
  }, []);

  function changeSceneryFocus(value: number) {
    setSceneryFocus(value);
    try { window.localStorage.setItem("xuli:scenery-focus:v1", String(value)); } catch { /* session-only */ }
  }

  async function loadRecordFolders() {
    const response = await fetch("/api/record-folders");
    if (!response.ok) return;
    const data = await response.json() as { folders?: RecordFolder[]; links?: RecordFolderLink[] };
    setRecordFolders(data.folders || []); setRecordFolderLinks(data.links || []);
  }

  useEffect(() => {
    fetch("/api/bases").then((response) => response.ok ? response.json() : null).then((data) => setAnalysisBases(data?.spaces || [])).catch(() => undefined);
    fetch("/api/record-folders").then((response) => response.ok ? response.json() : null).then((data) => { if (data) { setRecordFolders(data.folders || []); setRecordFolderLinks(data.links || []); } }).catch(() => undefined);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("xuli-scene-tags", JSON.stringify(sceneChoices));
  }, [sceneChoices]);

  useEffect(() => {
    fetch("/api/records")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { records?: StoredRecord[] }) => {
        if (data.records) setRecords(data.records);
      })
      .catch(() => {
        // The starter examples remain visible if local persistence is still warming up.
      });
  }, []);

  useEffect(() => {
    void postJson("/api/activity", { kind: "visit", summary: "打开了序理" });
    fetch("/api/activity?days=60").then((response) => response.ok ? response.json() : null).then((data) => {
      setActivityByDay(data?.byDay ?? {});
      setUsageByDay(data?.usageByDay ?? {});
      setTotalUsageSeconds(data?.totalUsageSeconds ?? 0);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let lastTick = Date.now();
    const dayKey = () => {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      return new Date(now.getTime() - offset).toISOString().slice(0, 10);
    };
    const heartbeat = async () => {
      const now = Date.now();
      const deltaSeconds = Math.max(1, Math.min(60, Math.round((now - lastTick) / 1000)));
      lastTick = now;
      if (document.visibilityState !== "visible") return;
      const day = dayKey();
      const response = await fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day, deltaSeconds }), keepalive: true }).catch(() => null);
      if (!response?.ok) return;
      setUsageByDay((current) => ({ ...current, [day]: (current[day] || 0) + deltaSeconds }));
      setTotalUsageSeconds((value) => value + deltaSeconds);
    };
    const flushOnLeave = () => {
      if (document.visibilityState !== "visible") return;
      const deltaSeconds = Math.max(1, Math.min(60, Math.round((Date.now() - lastTick) / 1000)));
      lastTick = Date.now();
      const body = new Blob([JSON.stringify({ day: dayKey(), deltaSeconds })], { type: "application/json" });
      navigator.sendBeacon?.("/api/usage", body);
    };
    const visibilityChanged = () => {
      if (document.visibilityState === "hidden") {
        const deltaSeconds = Math.max(1, Math.min(60, Math.round((Date.now() - lastTick) / 1000)));
        lastTick = Date.now();
        navigator.sendBeacon?.("/api/usage", new Blob([JSON.stringify({ day: dayKey(), deltaSeconds })], { type: "application/json" }));
      } else lastTick = Date.now();
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pagehide", flushOnLeave);
    const timer = window.setInterval(() => void heartbeat(), 15_000);
    return () => { document.removeEventListener("visibilitychange", visibilityChanged); window.removeEventListener("pagehide", flushOnLeave); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    fetch("/api/frameworks")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { frameworks?: FrameworkVersion[] }) => setFrameworkVersions(data.frameworks ?? []))
      .catch(() => setFrameworkVersions([]));
    fetch("/api/knowledge")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { imports?: KnowledgeImport[] }) => setKnowledgeImports(data.imports ?? []))
      .catch(() => setKnowledgeImports([]));
    fetch("/api/topics")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { topics?: Array<{ id: string; name: string; description: string; focusElement: string; focusStandard: string; sessionCount: number }> }) => setCustomTopics((data.topics ?? []).map((item) => ({ id: item.id, name: item.name, focus: `${item.focusElement} × ${item.focusStandard}`, sessions: item.sessionCount, progress: Math.min(100, item.sessionCount * 12), note: item.description }))))
      .catch(() => setCustomTopics([]));
  }, []);

  const pageTitle = useMemo(
    () => navItems.find((item) => item.id === activePage)?.label || "观星台",
    [activePage],
  );

  const filteredRecords = useMemo(() => records.filter((record) => {
    const query = recordQuery.trim().toLowerCase();
    const tags = (() => { try { return JSON.parse(record.tagsJson || "[]") as string[]; } catch { return []; } })();
    const matchesQuery = !query || `${record.title} ${record.content} ${record.primaryIssue} ${record.source} ${record.note} ${tags.join(" ")}`.toLowerCase().includes(query);
    const matchesFilter = recordFilter === "all"
      || (recordFilter === "integrated" && record.status === "integrated")
      || (recordFilter === "trained" && (record.status === "trained" || record.status === "reviewed"))
      || (recordFilter === "review" && record.status === "analyzed")
      || (recordFilter === "saved" && record.status === "saved");
    const matchesTag = !tagFilter || tags.includes(tagFilter);
    const matchesStars = !starFilter || record.importance === starFilter;
    return matchesQuery && matchesFilter && matchesTag && matchesStars;
  }), [records, recordFilter, recordQuery, starFilter, tagFilter]);

  const allRecordTags = useMemo(() => [...new Set(records.flatMap((record) => { try { return JSON.parse(record.tagsJson || "[]") as string[]; } catch { return []; } }))].sort(), [records]);
  const recordScenes = useMemo(() => [...new Set(records.map((record) => record.scene).filter(Boolean))].slice(0, 8), [records]);
  const organizedRecords = useMemo(() => filteredRecords.filter((record) => {
    if (activeFolderId === "all") return true;
    if (activeFolderId === "recent") return new Date(record.updatedAt || record.createdAt).getTime() >= RECENT_RECORD_CUTOFF;
    if (activeFolderId === "unfiled") return !recordFolderLinks.some((link) => link.recordId === record.id);
    if (activeFolderId.startsWith("scene:")) return record.scene === activeFolderId.slice(6);
    return recordFolderLinks.some((link) => link.folderId === activeFolderId && link.recordId === record.id);
  }), [activeFolderId, filteredRecords, recordFolderLinks]);

  const go = (page: PageKey) => {
    const destination = page === "knowledge" ? "records" : page;
    setActivePage(destination);
    if (destination !== "records") setSelectedRecord(null);
    if (page === "trash") void loadTrash();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function requestModelAnalysis(text: string, focus: string, analysisScene = "未指定", baseSpaceId = "meta-core") {
    const response = await postJson("/api/ai/analyze", { text, focus, scene: analysisScene, baseSpaceId });
    const data = (await response.json()) as { error?: string; result?: ModelAnalysis };
    if (!response.ok || !data.result) throw new Error(data.error || "模型分析失败，请重试。");
    return data.result;
  }

  async function runModelAnalysis() {
    if (analysisText.trim().length < 10) return;
    setModelLoading(true);
    setModelError("");
    setAnalysisComplete(false);
    setAnalysisSaveState("");
    try {
      const result = await requestModelAnalysis(analysisText, "整体分析", "观照室", analysisBaseId);
      setModelAnalysis(result);
      setAnalysisComplete(true);
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "模型分析失败，请重试。");
    } finally {
      setModelLoading(false);
    }
  }

  function openInAnalyze(record: StoredRecord, focus = "整体分析") {
    setAnalysisText(record.content); setAnalysisFocus(focus); setAnalysisRecordId(record.id); setAnalysisComplete(false); setAnalysisSaveState(""); setModelAnalysis(null); go("analyze");
  }

  function openIntegration(record: StoredRecord) {
    setIntegrationRecord(record);
    setActivePage("integration");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openTrainingAnalysis(text: string, focus: string) {
    setAnalysisText(text); setAnalysisFocus(focus); setAnalysisRecordId(""); setAnalysisComplete(false); setAnalysisSaveState(""); setModelAnalysis(null); go("analyze");
  }

  async function saveQuickAnalysis() {
    if (!modelAnalysis || !analysisText.trim()) return;
    setAnalysisSaveState("saving"); setModelError("");
    try {
      const reportContent = analysisToMarkdown(modelAnalysis, analysisFocus);
      let recordId = analysisRecordId;
      let baseRecord = records.find((item) => item.id === recordId);
      if (!recordId) {
        const response = await postJson("/api/records", { title: modelAnalysis.suggestedTitle || `观照记录 · ${new Date().toLocaleDateString("zh-CN")}`, content: analysisText, scene: modelAnalysis.suggestedScene || "观照室快速分析", mode: "record", source: "观照室快速分析", note: modelAnalysis.suggestedNote || "", tags: modelAnalysis.suggestedTags || [], importance: 3 });
        const data = (await response.json().catch(() => ({}))) as { record?: StoredRecord; error?: string };
        if (!response.ok || !data.record) throw new Error(data.error || "创建记录失败");
        baseRecord = data.record; recordId = data.record.id; setAnalysisRecordId(recordId); setRecords((items) => [data.record!, ...items]);
      }
      const response = await postJson("/api/records/update", { action: "analysis", recordId, summary: modelAnalysis.overview, primaryIssue: modelAnalysis.gaps[0] || "", structure: modelAnalysis.structure, assessments: modelAnalysis.assessments, issues: modelAnalysis.gaps, report: modelAnalysis, reportContent });
      if (!response.ok) throw new Error("保存报告失败");
      setRecords((items) => items.map((item) => item.id === recordId ? { ...(baseRecord || item), status: "analyzed", summary: modelAnalysis.overview, primaryIssue: modelAnalysis.gaps[0] || "", analysisReportJson: JSON.stringify(modelAnalysis), reportContent } : item));
      setAnalysisSaveState("saved");
    } catch (error) { setAnalysisSaveState(""); setModelError(error instanceof Error ? error.message : "保存失败"); }
  }

  async function createRecordFolder() {
    const name = window.prompt("给这个文件夹取一个名字"); if (!name?.trim()) return;
    await postJson("/api/record-folders", { action: "create", name: name.trim() }); await loadRecordFolders();
  }
  async function deleteRecordFolder(id: string) { if (!window.confirm("删除文件夹？其中记录不会被删除，只会回到未归档。")) return; await postJson("/api/record-folders", { action: "delete", id }); if (activeFolderId === id) setActiveFolderId("all"); await loadRecordFolders(); }
  async function moveRecordToFolder(recordId: string, folderId: string) { await postJson("/api/record-folders", { action: "move", recordId, folderId: folderId || null }); await loadRecordFolders(); }

  function discardQuickAnalysis() {
    setAnalysisComplete(false); setModelAnalysis(null); setAnalysisSaveState(""); setModelError("");
  }

  async function rebuildReportFromInitialAnalysis(record: StoredRecord) {
    try {
      const result = JSON.parse(record.analysisReportJson || "{}") as ModelAnalysis;
      if (!result.overview || !Array.isArray(result.reasoningJourney)) throw new Error("这条记录尚无完整的初步分析结果");
      const reportContent = analysisToMarkdown(result, "整体分析");
      const response = await fetch("/api/records", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, reportContent }) });
      if (!response.ok) throw new Error("重建报告失败");
      const updated = { ...record, reportContent };
      setRecords((items) => items.map((item) => item.id === record.id ? updated : item)); setSelectedRecord(updated);
    } catch (error) { setModelError(error instanceof Error ? error.message : "重建报告失败"); }
  }

  async function persistUnifiedRecord(analyze: boolean) {
    if (content.trim().length < 10) {
      setSaveWarning("先写下一段完整想法吧，至少 10 个字。");
      return;
    }
    if (!recordSource.trim()) {
      setSaveWarning("请填写出处；如果是你自己的想法，可以写“个人思考”或“自己的观察”。");
      return;
    }
    setSaveWarning("");
    if (analyze) setFlowPhase("saving");
    setAnalysisStep(0);

    let created: StoredRecord;
    try {
      const initialScene = scene || "待识别";
      const initialTags = [...new Set([...recordTags, ...(scene ? [scene] : []), ...(tagDraft.trim() ? [tagDraft.trim()] : [])])];
      const fallbackTitle = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.slice(0, 42) || `${recordSource} · 思维记录`;
      const response = await postJson("/api/records", { title: title || fallbackTitle, content, scene: initialScene, mode: "record", source: recordSource, sourceUrl: recordSourceUrl, note: recordNote, tags: initialTags, importance: recordImportance });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "保存失败，请稍后重试。");
      }
      const data = (await response.json()) as { record: StoredRecord };
      created = data.record;
      setSavedId(data.record.id);
      setRecords((current) => [data.record, ...current]);
    } catch (error) {
      setFlowPhase("compose");
      setSaveWarning(
        `${error instanceof Error ? error.message : "保存失败"} 原文仍保留在输入框中，请重试。`,
      );
      return;
    }

    if (!analyze) {
      resetFlow();
      setSelectedRecord(created);
      setActivePage("records");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setAnalysisStep(1);
      const result = await requestModelAnalysis(content, "整体分析", scene);
      setModelAnalysis(result);
      const completedScene = scene || result.suggestedScene || "日常思考";
      const completedTitle = title.trim() || result.suggestedTitle || created.title;
      const completedNote = recordNote.trim() || result.suggestedNote || "";
      const completedTags = [...new Set([...recordTags, completedScene, ...(result.suggestedTags || [])])].filter(Boolean).slice(0, 20);
      const enrichedResponse = await fetch("/api/records", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: created.id, title: completedTitle, content, scene: completedScene, source: recordSource, sourceUrl: recordSourceUrl, note: completedNote, tags: completedTags, importance: recordImportance }) });
      if (enrichedResponse.ok) {
        const enriched = (await enrichedResponse.json()) as { record: StoredRecord };
        created = enriched.record;
        setRecords((items) => items.map((item) => item.id === created.id ? created : item));
        setTitle(completedTitle); setScene(completedScene); setRecordNote(completedNote); setRecordTags(completedTags);
        if (!sceneChoices.includes(completedScene)) setSceneChoices((items) => [...items, completedScene]);
      }
      setAnalysisStep(3);
      const reportContent = analysisToMarkdown(result, "整体分析");
      const reportResponse = await postJson("/api/records/update", {
        action: "analysis", recordId: created.id, summary: result.overview,
        primaryIssue: result.gaps?.[0] || "暂无明确缺口", structure: result.structure,
        assessments: result.assessments, issues: result.gaps, report: result, reportContent,
      });
      if (!reportResponse.ok) throw new Error("完整分析结果归档失败");
      setRecords((items) => items.map((item) => item.id === created.id ? { ...item, status: "analyzed", summary: result.overview, primaryIssue: result.gaps?.[0] || "", analysisReportJson: JSON.stringify(result), reportContent } : item));
      setFlowPhase("assessment");
    } catch (error) {
      setFlowPhase("compose");
      setSaveWarning(`${error instanceof Error ? error.message : "分析失败"} 原文已经保存，可稍后重试分析。`);
    }
  }

  async function startAnalysis(event: FormEvent) { event.preventDefault(); await persistUnifiedRecord(true); }

  function resetFlow() {
    setFlowPhase("compose");
    setTitle("");
    setContent("");
    setScene("");
    setSavedId("");
    setSaveWarning("");
    setRecordSource(""); setRecordSourceUrl(""); setRecordNote(""); setRecordTags([]); setTagDraft(""); setRecordImportance(3);
  }

  function finishInitialAnalysis() {
    const record = records.find((item) => item.id === savedId);
    if (record) setSelectedRecord({ ...record, status: "analyzed", summary: modelAnalysis?.overview || record.summary, primaryIssue: modelAnalysis?.gaps?.[0] || record.primaryIssue, reportContent: modelAnalysis ? analysisToMarkdown(modelAnalysis, "整体分析") : record.reportContent });
    setActivePage("records"); setFlowPhase("compose"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveFrameworkVersion(event: FormEvent) {
    event.preventDefault();
    if (!frameworkEditor) return;
    setFrameworkSaveError("");
    try {
      const response = await postJson("/api/frameworks", {
        name: "Critical Thinking Base",
        version: versionName,
        description:
          frameworkEditor.kind === "version"
            ? versionNote
            : `${frameworkEditor.label}：${frameworkDraftTitle}。${frameworkDraftBody}`,
        definition: {
          elements: elements.map((item) => item.name),
          standards: qualityScores.map((item) => item.name),
          capabilities: capabilities.map((item) => item.name),
          draftChange: {
            kind: frameworkEditor.kind,
            target: frameworkEditor.label,
            title: frameworkDraftTitle,
            body: frameworkDraftBody,
          },
        },
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "草案保存失败，请稍后重试。");
      }
      const data = (await response.json()) as { framework: FrameworkVersion };
      setFrameworkVersions((versions) => [data.framework, ...versions]);
      setVersionSaved(true);
      setFrameworkEditor(null);
    } catch (error) {
      setFrameworkSaveError(
        error instanceof Error ? error.message : "草案保存失败，请稍后重试。",
      );
    }
  }

  function openFrameworkEditor(kind: FrameworkEditorKind, label: string) {
    setFrameworkSaveError("");
    setVersionSaved(false);
    setFrameworkEditor({ kind, label });

    const defaults: Record<FrameworkEditorKind, { title: string; body: string }> = {
      version: {
        title: "Critical Thinking Base V1.1",
        body: versionNote,
      },
      elements: {
        title: "思维元素调整",
        body: "说明要新增、修改或停用的思维元素，以及修改理由。",
      },
      standards: {
        title: label === "思维标准" ? "思维标准调整" : `${label}定义调整`,
        body: "说明定义、正反证据、证据门槛或推荐追问需要怎样调整。",
      },
      relations: {
        title: "Element × Standard 关系调整",
        body: "说明需要新增或修改的元素—标准关系，以及适用场景。",
      },
      capability: {
        title: `${label}映射调整`,
        body: "说明该综合能力应参考哪些思维元素与思维标准。",
      },
    };

    setFrameworkDraftTitle(defaults[kind].title);
    setFrameworkDraftBody(defaults[kind].body);
  }

  async function analyzeKnowledgeImport() {
    setKnowledgeMessage("");
    setKnowledgeAnalyzed(false);
    try {
      const response = await postJson("/api/knowledge", {
        content: knowledgeText,
        source: knowledgeSource,
        note: knowledgeNote,
      });
      const data = (await response.json()) as {
        error?: string;
        item?: KnowledgeImport;
        analysis?: ImportAnalysis;
      };
      if (!response.ok || !data.item || !data.analysis) throw new Error(data.error || "分析失败，请重试。");
      setCurrentImport(data.item);
      setCurrentImportAnalysis(data.analysis);
      setKnowledgeImports((items) => [data.item!, ...items]);
      setKnowledgeAnalyzed(true);
    } catch (error) {
      setKnowledgeMessage(error instanceof Error ? error.message : "分析失败，请重试。");
    }
  }

  async function updateImportDisposition(disposition: string) {
    if (!currentImport) return;
    setKnowledgeMessage("");
    try {
      const response = await fetch("/api/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentImport.id, disposition }),
      });
      if (!response.ok) throw new Error("状态保存失败，请重试。");
      setKnowledgeImports((items) => items.map((item) => item.id === currentImport.id ? { ...item, disposition } : item));
      setCurrentImport({ ...currentImport, disposition });
      setKnowledgeMessage(disposition === "patch" ? "已作为小补丁收录。" : disposition === "material" ? "已保存为候选材料。" : "已暂存，随时可以回来继续。" );
    } catch (error) {
      setKnowledgeMessage(error instanceof Error ? error.message : "状态保存失败，请重试。");
    }
  }

  async function saveRecordEdit() {
    if (!editingRecord || editingRecord.content.trim().length < 10) return;
    const response = await fetch("/api/records", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingRecord.id, title: editingRecord.title, content: editingRecord.content, scene: editingRecord.scene, source: editingRecord.source, sourceUrl: editingRecord.sourceUrl, note: editingRecord.note, tags: JSON.parse(editingRecord.tagsJson || "[]"), importance: editingRecord.importance, annotations: JSON.parse(editingRecord.annotationsJson || "[]"), reportContent: editingRecord.reportContent }) });
    const data = await response.json();
    if (!response.ok || !data.record) return;
    setRecords((items) => items.map((item) => item.id === data.record.id ? data.record : item));
    if (selectedRecord?.id === data.record.id) setSelectedRecord(data.record);
    setEditingRecord(null);
  }

  async function addAnnotation(target: "record" | "report") {
    if (!selectedRecord || !annotationDraft.trim()) return;
    const annotations = (() => { try { return JSON.parse(selectedRecord.annotationsJson || "[]") as Array<{ id: string; target: string; content: string; createdAt: string }>; } catch { return []; } })();
    const next = [...annotations, { id: crypto.randomUUID(), target, content: annotationDraft.trim(), createdAt: new Date().toISOString() }];
    const response = await fetch("/api/records", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedRecord.id, annotations: next }) });
    if (response.ok) { const data = await response.json(); setSelectedRecord(data.record); setRecords((items) => items.map((item) => item.id === data.record.id ? data.record : item)); setAnnotationDraft(""); }
  }

  async function mergeSelectedRecords() {
    if (selectedRecordIds.length < 2) return;
    const response = await postJson("/api/records/merge", { ids: selectedRecordIds, title: mergeTitle }); const data = await response.json();
    if (response.ok && data.record) { setRecords((items) => [data.record, ...items]); setSelectedRecordIds([]); setMergeTitle(""); setSelectedRecord(data.record); }
  }

  async function moveRecordToTrash(record: StoredRecord) {
    const response = await fetch("/api/records", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id }) });
    if (!response.ok) return;
    setRecords((items) => items.filter((item) => item.id !== record.id));
    if (selectedRecord?.id === record.id) setSelectedRecord(null);
  }

  async function saveImportEdit() {
    if (!editingImport || !editingImport.source.trim() || editingImport.content.trim().length < 10) return;
    const response = await fetch("/api/knowledge", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingImport.id, content: editingImport.content, source: editingImport.source, note: editingImport.note }) });
    const data = await response.json();
    if (!response.ok || !data.item) return;
    setKnowledgeImports((items) => items.map((item) => item.id === data.item.id ? data.item : item));
    setEditingImport(null);
  }

  async function moveImportToTrash(item: KnowledgeImport) {
    const response = await fetch("/api/knowledge", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    if (!response.ok) return;
    setKnowledgeImports((items) => items.filter((entry) => entry.id !== item.id));
  }

  async function loadTrash() {
    const response = await fetch("/api/trash");
    if (!response.ok) return;
    const data = await response.json();
    setTrashRecords(data.records ?? []);
    setTrashImports(data.imports ?? []);
  }

  async function trashAction(type: "record" | "import", id: string, action: "restore" | "delete") {
    const response = await fetch("/api/trash", { method: action === "restore" ? "PATCH" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id }) });
    if (!response.ok) return;
    await loadTrash();
    if (action === "restore") {
      const [recordResponse, importResponse] = await Promise.all([fetch("/api/records"), fetch("/api/knowledge")]);
      if (recordResponse.ok) setRecords((await recordResponse.json()).records ?? []);
      if (importResponse.ok) setKnowledgeImports((await importResponse.json()).imports ?? []);
    }
  }

  function renderDashboard() {
    const legacyDashboard = (
      <>
        <div className="dashboard-intro">
          <div>
            <span className="eyebrow">过去 30 天 · 12 次有效记录</span>
            <h1>你的思考，正在变得更稳。</h1>
            <p>你更常先澄清问题再下判断；下一步，是主动寻找最强的反方解释。</p>
          </div>
          <button className="primary-button compact" onClick={() => go("new")}>
            <span aria-hidden="true">＋</span> 记录新的思考
          </button>
        </div>

        <section className="status-grid">
          <article className="card status-card">
            <div className="card-kicker">稳定思维质量</div>
            <div className="score-row">
              <strong>74</strong>
              <div>
                <span className="trend-up">↑ 3.8</span>
                <small>较上个 30 天</small>
              </div>
            </div>
            <div className="soft-divider" />
            <div className="status-summary">
              <span className="status-dot" />
              <p>
                当前处于<strong>稳步上升</strong>阶段，9 项标准中有 7 项获得了足够证据。
              </p>
            </div>
          </article>

          <article className="card focus-card">
            <div className="focus-topline">
              <span className="card-kicker">本周训练焦点</span>
              <span className="pill sage">进行中</span>
            </div>
            <h3>看见另一种解释</h3>
            <p>观点 × 广度</p>
            <div className="focus-progress">
              <div><span style={{ width: "62%" }} /></div>
              <small>3 / 5 次练习</small>
            </div>
            <button className="text-button" onClick={() => go("topics")}>
              继续训练 <span aria-hidden="true">→</span>
            </button>
          </article>

          <article className="card strength-card">
            <span className="card-kicker">当前画像</span>
            <div className="strength-item">
              <span className="strength-mark best">强</span>
              <div><small>最稳定</small><strong>问题分析 · 77</strong></div>
            </div>
            <div className="strength-item">
              <span className="strength-mark focus">练</span>
              <div><small>最值得提升</small><strong>广度 · 61</strong></div>
            </div>
          </article>
        </section>

        <section className="dashboard-two-col">
          <article className="card quality-card">
            <SectionHeader
              eyebrow="底层标准"
              title="我的思维质量"
              note="只纳入证据充分、经过多次真实记录验证的结果。"
              action={<button className="text-button" onClick={() => go("growth")}>查看趋势 →</button>}
            />
            <div className="quality-layout">
              <RadarChart />
              <div className="quality-list">
                {qualityScores.map((item) => (
                  <div className="quality-row" key={item.name}>
                    <span>{item.name}</span>
                    <div className="mini-bar"><i style={{ width: `${item.score}%` }} /></div>
                    <strong>{item.score}</strong>
                    <small className={item.change >= 0 ? "positive" : "negative"}>
                      {item.change >= 0 ? "+" : ""}{item.change}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="card structure-habit-card">
            <SectionHeader
              eyebrow="主动处理程度"
              title="我的思维结构习惯"
              note="你是否会自然地照顾到一次思考的关键组成部分。"
            />
            <div className="habit-summary">
              <span className="quote-mark">“</span>
              <p>你通常能明确问题并构建推理，但较少主动识别隐含假设，也较少系统考虑长期后果。</p>
            </div>
            <div className="habit-grid">
              {elements.map((item) => (
                <div className="habit-item" key={item.name}>
                  <div className="habit-label"><span>{item.name}</span><strong>{item.level}</strong></div>
                  <div className="habit-track"><i style={{ width: `${item.level}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="card trend-card">
          <SectionHeader
            eyebrow="长期追踪"
            title="思维质量成长曲线"
            note="实线代表稳定趋势，虚线代表训练后的即时变化。"
            action={
              <div className="chart-legend">
                <span><i className="legend-solid" /> 稳定趋势</span>
                <span><i className="legend-dashed" /> 即时变化</span>
              </div>
            }
          />
          <GrowthChart />
        </section>

        <section className="dashboard-two-col lower-grid">
          <article className="card">
            <SectionHeader
              eyebrow="问题模式库"
              title="最近反复出现的问题"
              note="来自多次记录的长期积累，而不是一次性评价。"
              action={<button className="text-button" onClick={() => go("topics")}>全部专题 →</button>}
            />
            <div className="problem-list">
              {problems.map((problem) => (
                <div className="problem-row" key={problem.name}>
                  <div className="problem-count"><strong>{problem.count}</strong><small>次</small></div>
                  <div className="problem-main">
                    <strong>{problem.name}</strong>
                    <span>{problem.pair} · 最近 {problem.last}</span>
                  </div>
                  <span className={`pill ${problem.trend === "训练中" ? "sage" : ""}`}>{problem.trend}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <SectionHeader
              eyebrow="思维档案"
              title="最近记录"
              action={<button className="text-button" onClick={() => go("records")}>查看全部 →</button>}
            />
            <div className="recent-list">
              {records.slice(0, 3).map((record) => (
                <button
                  className="recent-row"
                  key={record.id}
                  onClick={() => {
                    setSelectedRecord(record);
                    go("records");
                  }}
                >
                  <span className="recent-date">{formatDate(record.createdAt)}</span>
                  <div>
                    <strong>{record.title}</strong>
                    <span>{record.scene} · {record.primaryIssue || "等待分析"}</span>
                  </div>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </article>
        </section>
      </>
    );
    void legacyDashboard;
    return <DynamicHome records={records} topicCount={topics.length + customTopics.length} versionCount={frameworkVersions.length} usageTotalSeconds={totalUsageSeconds} onNavigate={go} />;
  }

  function renderRecords() {
    if (selectedRecord) {
      return (
        <div className="detail-page">
          <button className="back-button" onClick={() => setSelectedRecord(null)}>← 返回记录列表</button>
          <div className="record-detail-header">
            <div>
              <span className="eyebrow">{selectedRecord.scene} · {formatDate(selectedRecord.createdAt)}</span>
              <h1>{selectedRecord.title}</h1>
              <p>{selectedRecord.summary || "这条记录正在等待进一步分析。"}</p>
              <div className="record-detail-meta"><span>{"★".repeat(selectedRecord.importance || 3)}{"☆".repeat(5 - (selectedRecord.importance || 3))}</span>{(() => { try { return (JSON.parse(selectedRecord.tagsJson || "[]") as string[]).map((tag) => <i key={tag}>#{tag}</i>); } catch { return null; } })()}</div>
            </div>
            <div className="record-detail-actions"><span className="framework-stamp">{selectedRecord.frameworkVersion}</span><button className="integration-entry" onClick={() => openIntegration(selectedRecord)}>∞ <span>融入思维基座</span></button><button className="quiet-action" onClick={() => openInAnalyze(selectedRecord)}>◉ <span>送入观照室</span></button><button className="quiet-action" title="修订记录" onClick={() => { setEditingTarget("record"); setEditingRecord({ ...selectedRecord }); }}>✎ <span>修订</span></button><button className="quiet-action quiet-danger" title="移入回收站" onClick={() => void moveRecordToTrash(selectedRecord)}>⌫ <span>归藏</span></button></div>
          </div>
          <section className="detail-grid">
            <article className="card raw-record-card">
              <span className="card-kicker">原始记录</span>
              {(selectedRecord.source || selectedRecord.sourceUrl) && <div className="record-provenance"><strong>{selectedRecord.source || "外部来源"}</strong>{selectedRecord.sourceUrl && <a href={selectedRecord.sourceUrl} target="_blank" rel="noreferrer">打开原链接 ↗</a>}</div>}
              <RichTextView>{selectedRecord.content}</RichTextView>
              {selectedRecord.note && <aside className="moment-note"><span>此刻札记</span><p>{selectedRecord.note}</p></aside>}
            </article>
            <article className="card">
              <span className="card-kicker">档案状态</span>
              <div className="archive-state">
                <div><span className="state-done">✓</span><p><strong>原文已保存</strong><small>保留原始输入，不被后续分析覆盖</small></p></div>
                <div><span className={selectedRecord.reportContent ? "state-done" : "state-wait"}>{selectedRecord.reportContent ? "✓" : "·"}</span><p><strong>完整初步分析</strong><small>按当时启用的基座流程生成并原样归档</small></p></div>
                <div><span className={["analyzed", "trained", "reviewed"].includes(selectedRecord.status) ? "state-done" : "state-wait"}>{["analyzed", "trained", "reviewed"].includes(selectedRecord.status) ? "✓" : "·"}</span><p><strong>分析报告</strong><small>{selectedRecord.reportContent ? "与原文共同归档" : "可随时选择分析"}</small></p></div>
              </div>
            </article>
          </section>
          {selectedRecord.reportContent ? <section className="card saved-report-card"><div className="saved-report-head"><div><span className="eyebrow">SAVED INITIAL ANALYSIS</span><h2>与初步分析一致的完整报告</h2></div><div><button className="quiet-action" title="用已保存的初步分析结果替换当前报告正文" onClick={() => void rebuildReportFromInitialAnalysis(selectedRecord)}>↻ 按初步分析重建</button><button className="quiet-action" onClick={() => { setEditingTarget("report"); setEditingRecord({ ...selectedRecord }); }}>✎ 编辑报告</button></div></div><RichTextView>{selectedRecord.reportContent}</RichTextView></section> : <section className="card empty-report-card"><div><span className="eyebrow">OPTIONAL ANALYSIS</span><h2>原文已经安全保存。分析是可选的。</h2><p>你可以现在用完整体系分析，也可以在以后真正需要时再进入观照室。</p></div><button className="primary-button" onClick={() => openInAnalyze(selectedRecord)}>分析这条记录 →</button></section>}
          <RecordRelations recordId={selectedRecord.id} onOpenRecord={(id) => { const record = records.find((item) => item.id === id); if (record) setSelectedRecord(record); }} />
          <section className="card annotation-card"><SectionHeader eyebrow="有时批注" title="给原文与报告留下时间刻度" note="批注不会覆盖正文，并会保留写下时的准确时间。" /><div className="annotation-compose"><select id="annotation-target"><option value="record">批注原文</option><option value="report">批注报告</option></select><textarea value={annotationDraft} onChange={(event) => setAnnotationDraft(event.target.value)} placeholder="写下补充、疑问、反例或后来改变的看法…" /><button disabled={!annotationDraft.trim()} onClick={() => { const target = (document.getElementById("annotation-target") as HTMLSelectElement)?.value === "report" ? "report" : "record"; void addAnnotation(target); }}>留下批注</button></div><div className="annotation-timeline">{(() => { try { const notes = JSON.parse(selectedRecord.annotationsJson || "[]") as Array<{ id: string; target: string; content: string; createdAt: string }>; return notes.length ? notes.map((item) => <article key={item.id}><span>{item.target === "report" ? "报告" : "原文"}</span><p>{item.content}</p><time>{new Date(item.createdAt).toLocaleString("zh-CN")}</time></article>) : <p className="empty-ledger">还没有批注。</p>; } catch { return null; } })()}</div></section>
          <section className="card evidence-summary-card">
            <SectionHeader eyebrow="关键发现" title="本次最值得继续深入的地方" />
            <div className="finding-grid">
              <div><span className="finding-number">01</span><strong>{selectedRecord.primaryIssue || "证据结构需要进一步补充"}</strong><p>这不是对整体能力的贴标签，而是本次记录里有证据支持的具体发现。</p></div>
              <div><span className="finding-number">02</span><strong>评分与证据分开保存</strong><p>证据不足的组合不会被低分替代，也不会进入长期稳定趋势。</p></div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <>
        <SectionHeader
          eyebrow="完整思维档案"
          title="思维记录与知识输入"
          note="阅读材料也是思维记录。原文、出处、札记、标签、分析报告与后来批注都在同一条档案中。"
          action={<button className="primary-button compact" onClick={() => go("new")}>＋ 新建 / 导入</button>}
        />
        <div className="record-library-layout">
        <aside className="record-folder-rail card"><header><div><span className="eyebrow">LIBRARY</span><h3>记录文件夹</h3></div><button onClick={() => void createRecordFolder()} title="新增文件夹">＋</button></header><nav><button className={activeFolderId === "all" ? "active" : ""} onClick={() => setActiveFolderId("all")}><span>◫</span><strong>全部记录</strong><i>{records.length}</i></button><button className={activeFolderId === "recent" ? "active" : ""} onClick={() => setActiveFolderId("recent")}><span>◷</span><strong>最近 30 天</strong></button><button className={activeFolderId === "unfiled" ? "active" : ""} onClick={() => setActiveFolderId("unfiled")}><span>◇</span><strong>未归档</strong><i>{records.filter((record) => !recordFolderLinks.some((link) => link.recordId === record.id)).length}</i></button></nav><div className="custom-folder-list smart-folder-list"><span>按记录类型</span>{recordScenes.map((scene) => <div key={scene} className={activeFolderId === `scene:${scene}` ? "active" : ""}><button onClick={() => setActiveFolderId(`scene:${scene}`)}><span>◈</span><strong>{scene}</strong><i>{records.filter((record) => record.scene === scene).length}</i></button></div>)}</div><div className="custom-folder-list"><span>我的分类</span>{recordFolders.map((folder) => <div key={folder.id} className={activeFolderId === folder.id ? "active" : ""}><button onClick={() => setActiveFolderId(folder.id)}><span>▱</span><strong>{folder.name}</strong><i>{recordFolderLinks.filter((link) => link.folderId === folder.id).length}</i></button><button title="删除文件夹" onClick={() => void deleteRecordFolder(folder.id)}>×</button></div>)}</div></aside>
        <section className="record-library-main"><div className="record-toolbar card">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input aria-label="搜索记录" value={recordQuery} onChange={(event) => setRecordQuery(event.target.value)} placeholder="搜索标题、内容或问题…" />
          </label>
          <div className="filter-chips">
            <button className={`chip ${recordFilter === "all" ? "active" : ""}`} onClick={() => setRecordFilter("all")}>全部</button>
            <button className={`chip ${recordFilter === "integrated" ? "active" : ""}`} onClick={() => setRecordFilter("integrated")}>已融入基座</button>
            <button className={`chip ${recordFilter === "trained" ? "active" : ""}`} onClick={() => setRecordFilter("trained")}>已进一步整理</button>
            <button className={`chip ${recordFilter === "review" ? "active" : ""}`} onClick={() => setRecordFilter("review")}>待复盘</button>
            <button className={`chip ${recordFilter === "saved" ? "active" : ""}`} onClick={() => setRecordFilter("saved")}>仅保存</button>
          </div>
          <select aria-label="按标签筛选" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}><option value="">全部标签</option>{allRecordTags.map((tag) => <option key={tag}>{tag}</option>)}</select>
          <select aria-label="按重要性筛选" value={starFilter} onChange={(event) => setStarFilter(Number(event.target.value))}><option value="0">全部星级</option>{[5,4,3,2,1].map((star) => <option value={star} key={star}>{star} 星</option>)}</select>
        </div>
        {selectedRecordIds.length > 0 && <div className="merge-tray card"><span>已选择 {selectedRecordIds.length} 条</span><input value={mergeTitle} onChange={(event) => setMergeTitle(event.target.value)} placeholder="合并后档案名称（可选）" /><button disabled={selectedRecordIds.length < 2} onClick={() => void mergeSelectedRecords()}>合并为新档案</button><button onClick={() => setSelectedRecordIds([])}>取消</button></div>}
        <div className="records-list">
          {organizedRecords.map((record) => (
            <article className="record-card card" key={record.id}>
              <label className="record-select" title="选择后可合并"><input type="checkbox" checked={selectedRecordIds.includes(record.id)} onChange={(event) => setSelectedRecordIds((ids) => event.target.checked ? [...ids, record.id] : ids.filter((id) => id !== record.id))} /><span /></label>
              <button className="record-card-main" onClick={() => setSelectedRecord(record)}>
              <div className="record-date">
                <strong>{new Date(record.createdAt).getDate()}</strong>
                <span>{new Intl.DateTimeFormat("zh-CN", { month: "short" }).format(new Date(record.createdAt))}</span>
              </div>
              <div className="record-body">
                <div className="record-meta">
                  <span className="pill">{record.scene}</span>
                  <span className="record-stars">{"★".repeat(record.importance || 3)}{"☆".repeat(5 - (record.importance || 3))}</span>
                </div>
                <h3>{record.title}</h3>
                <p>{record.summary || record.content.slice(0, 88)}</p>
                <div className="record-tags">{(() => { try { return (JSON.parse(record.tagsJson || "[]") as string[]).slice(0, 4).map((tag) => <i key={tag}>#{tag}</i>); } catch { return null; } })()}{record.source && <small>{record.source}</small>}</div>
                <div className="record-bottom">
                  <span><i className="tiny-dot" /> {record.primaryIssue || "等待分析"}</span>
                  <span className={`status-label status-${record.status}`}>
                    {record.status === "integrated" ? "已融入基座" : record.status === "trained" || record.status === "reviewed" ? "已进一步整理" : record.status === "analyzed" ? "已分析" : "已保存"}
                  </span>
                </div>
              </div>
              <span className="record-arrow" aria-hidden="true">→</span>
              </button>
              <div className="record-quick-actions"><select aria-label="移动到文件夹" title="移动到文件夹" value={recordFolderLinks.find((link) => link.recordId === record.id)?.folderId || ""} onChange={(event) => void moveRecordToFolder(record.id, event.target.value)}><option value="">未归档</option>{recordFolders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select><button title="修订" aria-label="修订记录" onClick={() => setEditingRecord({ ...record })}>✎</button><button title="移入回收站" aria-label="移入回收站" onClick={() => void moveRecordToTrash(record)}>⌫</button></div>
            </article>
          ))}
          {organizedRecords.length === 0 && <div className="card empty-search">这个文件夹里还没有符合条件的记录。</div>}
        </div>
        </section></div>
      </>
    );
  }

  function renderNewRecord() {
    if (flowPhase === "compose") {
      return (
        <div className="new-record-shell">
          <div className="new-record-intro">
            <span className="eyebrow">UNIFIED CAPTURE · 记录与输入</span>
            <h1>先留下，再决定要走多深。</h1>
            <p>可以是一段自己的想法，也可以是书、文章、课程或链接。仅保存不会触发分析，更不会强迫你进入复盘。</p>
          </div>
          <form className="record-compose card" onSubmit={startAnalysis}>
            <div className="light-mode-banner"><span>轻记录</span><div><strong>一次分析，原样归档</strong><p>仅保存不会触发分析；选择分析后，页面看到的完整结果就是最终报告，不再二次转录。</p></div><i>01</i></div>
            <label className="field-label primary-capture-field">出处 <span>必填 · 书名、作者、课程、对话；自己的想法可写“个人思考”</span><input required value={recordSource} onChange={(event) => setRecordSource(event.target.value)} placeholder="例如：《批判性思维工具》第三章" /></label>
            <label className="field-label record-text-label">
              记录你的思考 <span>必填 · 粘贴内容会原样保留段落与换行</span>
              <MarkdownComposer value={content} onChange={setContent} sourceChanged={(value) => { if (/^https?:\/\//.test(value)) setRecordSourceUrl(value); else if (!recordSource) setRecordSource(value); }} placeholder="写下自己的思考，或导入文档、图片与外部文章。内容可以边输入边排版…" />
              <span className="char-count">{content.length} 字</span>
            </label>
            <details className="optional-record-fields">
              <summary><strong>补充整理信息</strong><span>全部可选；留空会在初步分析后自动补充</span></summary>
              <div className="optional-record-body">
                <div className="record-source-grid"><label className="field-label">标题 <span>可选</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="系统可根据正文自动命名" /></label><label className="field-label">原始链接 <span>可选</span><input type="url" value={recordSourceUrl} onChange={(event) => setRecordSourceUrl(event.target.value)} placeholder="https://…" /></label></div>
                <fieldset className="scene-field">
                  <legend>这次思考发生在 <span>可新增、选择或删除；选中后也会成为搜索标签</span></legend>
                  <div className="scene-options editable-scene-options">
                    {sceneChoices.map((item) => <span className={scene === item ? "active" : ""} key={item}><button type="button" onClick={() => setScene(scene === item ? "" : item)}>{item}</button><button type="button" aria-label={`删除情境标签 ${item}`} onClick={() => { setSceneChoices((items) => items.filter((choice) => choice !== item)); if (scene === item) setScene(""); }}>×</button></span>)}
                    <label><input value={sceneDraft} onChange={(event) => setSceneDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && sceneDraft.trim()) { event.preventDefault(); const next = sceneDraft.trim(); setSceneChoices((items) => [...new Set([...items, next])]); setScene(next); setSceneDraft(""); } }} placeholder="新增情境后按回车" /></label>
                  </div>
                </fieldset>
                <label className="field-label">此刻札记 <span>可选 · 系统可补充“为什么值得留下”</span><textarea className="record-moment-input" value={recordNote} onChange={(event) => setRecordNote(event.target.value)} placeholder="它触动了什么？与你已有的经验怎样连接？" /></label>
                <div className="record-organize-row"><div className="tag-editor"><span>其他标签 · 可选</span><div>{recordTags.map((tag) => <button type="button" key={tag} onClick={() => setRecordTags((tags) => tags.filter((item) => item !== tag))}>#{tag} ×</button>)}<input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === ",") && tagDraft.trim()) { event.preventDefault(); setRecordTags((tags) => [...new Set([...tags, tagDraft.trim().replace(/,$/, "")])]); setTagDraft(""); } }} placeholder="输入后按回车" /></div></div><div className="importance-picker"><span>重要性 · 可选</span><div>{[1,2,3,4,5].map((star) => <button type="button" aria-label={`${star} 星`} className={star <= recordImportance ? "active" : ""} key={star} onClick={() => setRecordImportance(star)}>★</button>)}</div></div></div>
              </div>
            </details>
            <details className="mother-prompts">
              <summary>不知道从哪里开始？试试 3 个母问题</summary>
              <div>
                <button type="button" onClick={() => setContent((value) => `${value}${value ? "\n\n" : ""}我到底在回答什么问题？\n`)}>
                  我到底在回答什么问题？
                </button>
                <button type="button" onClick={() => setContent((value) => `${value}${value ? "\n\n" : ""}我凭什么这么说？\n`)}>
                  我凭什么这么说？
                </button>
                <button type="button" onClick={() => setContent((value) => `${value}${value ? "\n\n" : ""}还有没有别的理解方式？\n`)}>
                  还有没有别的理解方式？
                </button>
              </div>
            </details>
            {saveWarning && <p className="form-warning">{saveWarning}</p>}
            <div className="compose-actions">
              <button type="button" className="ghost-button" onClick={() => void persistUnifiedRecord(false)}>仅保存，先到这里</button>
              <button className="primary-button" type="submit">保存并做初步分析 <span aria-hidden="true">→</span></button>
            </div>
            <p className="save-promise"><span aria-hidden="true">✓</span> 两个动作都会先保存原文。初步分析已包含理解路径、结构整理和启发式问题。</p>
          </form>
        </div>
      );
    }

    if (flowPhase === "saving") {
      const steps = ["原文已安全保存", "正在读取当前思维基座", "正在沿可执行流程分析", "正在原样归档完整报告"];
      return (
        <div className="analysis-loading">
          <div className="analysis-orbit"><span /><i /></div>
          <span className="eyebrow">ONE PASS · ONE REPORT</span>
          <h1>正在沿你的思维体系一步步理解…</h1>
          <p>结果只生成一次：你看到什么，记录里就保存什么。</p>
          <div className="analysis-steps card">
            {steps.map((step, index) => (
              <div key={step} className={index <= analysisStep ? "done" : ""}>
                <span>{index < analysisStep ? "✓" : index === analysisStep ? "·" : ""}</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (flowPhase === "assessment") {
      return (
        <div className="analysis-page">
          <div className="analysis-breadcrumb"><span className="done">1 原文保存</span><i /><span className="current">2 完整初步分析</span><i /><span className="done">3 原样归档</span></div>
          <SectionHeader
            eyebrow="阶段二 · 连续理解"
            title="从原文出发，沿着一条路走到本质"
            note="不再把思维拆成一张评分表。体系标准在后台帮助检查，页面只呈现人真正能够跟随和操作的理解过程。"
          />
          <section className="thinking-journey-overview card">
            <div>
              <span className="card-kicker">先抓住它真正想说什么</span>
              <h3>{modelAnalysis?.overview || "已完成整体理解。"}</h3>
              <p>下面每一步都会说明：我从哪里出发、做了什么思考动作、为什么可以走到下一步。</p>
            </div>
            <div className="journey-destination"><span>暂时走到</span><strong>{modelAnalysis?.focusFinding || "一个可继续修正的理解"}</strong></div>
          </section>
          <section className="human-thinking-path">{(modelAnalysis?.reasoningJourney || []).map((item, index) => <article className="card" key={`${item.step}-${index}`}><i>{String(index + 1).padStart(2, "0")}</i><div><span>{item.step}</span><h3>{item.thoughtMove}</h3><p>{item.from}</p><div className="thought-transition"><b>所以我暂时走到：</b>{item.to}</div><details><summary>为什么可以从这里走到下一步？</summary><p>{item.why}</p><small>调用的个人体系：{item.framework}</small></details></div></article>)}</section>
          <section className="turning-points"><article className="card"><span>已经站得住的部分</span>{(modelAnalysis?.strengths || []).map((item) => <p key={item}>＋ {item}</p>)}</article><article className="card"><span>还不能轻易跨过去的部分</span>{(modelAnalysis?.gaps || []).map((item) => <p key={item}>△ {item}</p>)}</article><article className="card"><span>下一步最小行动</span><strong>{modelAnalysis?.nextStep || "继续补充证据。"}</strong></article></section>
          <section className="question-construction-lab"><header><span className="eyebrow">QUESTION MAKING · 学会问题怎样生长</span><h2>问题不是凭空出现的，而是从理解受阻的地方长出来。</h2><p>先读问题；需要时再展开完整构建过程，避免一次承受过多说明。</p></header>{(modelAnalysis?.questions || []).map((item, index) => <article className="card" key={`${item.question}-${index}`}><div className="question-number">Q{index + 1}</div><div><h3>{item.question}</h3><details><summary>展开：这个问题是怎样一步一步长出来的？</summary><div className="question-birth-path"><span>观察原文</span><i>→</i><span>发现缺口</span><i>→</i><span>确定思考动作</span><i>→</i><span>收窄问题</span></div><p>{item.rationale}</p><blockquote>{item.basis}</blockquote><small>仿照方法：先找到一句“还不能直接相信或理解”的话，再问自己缺的是事实、概念、假设、其他观点还是后果；最后把问题写成一个能够用具体证据回答的句子。</small></details></div></article>)}</section>
          <div className="sticky-action card">
            <div><strong>页面中的完整初步分析已经原样随记录保存</strong><span>结构理解、推理路径和问题构建思路不再经过第二次转录。</span></div>
            <div><button className="ghost-button" onClick={finishInitialAnalysis}>完成并查看记录</button><button className="primary-button" disabled={!savedId} onClick={() => { const record = records.find((item) => item.id === savedId); if (record) openIntegration({ ...record, reportContent: modelAnalysis ? analysisToMarkdown(modelAnalysis, "整体分析") : record.reportContent }); }}>判断如何融入基座 →</button></div>
          </div>
        </div>
      );
    }

    return null;
  }

  function renderGrowth() {
    return <GrowthOverview records={records} byDay={activityByDay} usageByDay={usageByDay} totalUsageSeconds={totalUsageSeconds} onOpenRecord={(id) => { const record = records.find((item) => item.id === id); if (record) { setSelectedRecord(record); setActivePage("records"); } }} />;
  }

  function renderTopics() {
    return <TrainingHub records={records} onAnalyze={openTrainingAnalysis} />;
  }

  function renderKnowledge() {
    return (
      <>
        <SectionHeader eyebrow="拾穗门 · INGESTION" title="让每一次阅读，都成为体系的新枝叶" note="提交内容、出处与当下札记。系统先判断它与现有基座的关系，再由你决定收录、暂存或共创新版本。" />
        <section className="knowledge-workbench">
          <article className="card knowledge-editor-panel">
            <div className="knowledge-editor-head"><div><span className="card-kicker">NEW SOURCE / 一则新材料</span><h2>把思想放在桌面上，边读边整理</h2></div><span>{knowledgeText.length} 字</span></div>
            <MarkdownComposer value={knowledgeText} onChange={setKnowledgeText} sourceChanged={setKnowledgeSource} placeholder="直接书写，或导入常见文档与公开网页。使用上方工具栏设置标题、加粗、高光、下划线或插图。" />
          </article>
          <aside className="knowledge-context-panel">
            <article className="card source-card"><span className="card-kicker">SOURCE</span><label className="field-label">出处<input value={knowledgeSource} onChange={(event) => setKnowledgeSource(event.target.value)} placeholder="书名、章节、作者或原始链接" /></label><label className="field-label">此刻札记<textarea className="knowledge-note" value={knowledgeNote} onChange={(event) => setKnowledgeNote(event.target.value)} placeholder="它为什么触动你？可能改变什么？" /></label>{knowledgeMessage && <p className="form-warning">{knowledgeMessage}</p>}<button className="primary-button" disabled={knowledgeText.trim().length < 10 || !knowledgeSource.trim()} onClick={analyzeKnowledgeImport}>与现有基座对照 →</button></article>
            <article className="card knowledge-principle"><span className="principle-mark">慎</span><h3>先理解，后归位</h3><p>材料不会静默改变正式基座。受限网页会尝试增强读取；英文文章会附上中英双语摘要。</p><div className="ingestion-steps"><span>01 读懂原文</span><span>02 对照体系</span><span>03 决定归宿</span></div></article>
          </aside>
        </section>
        {knowledgeAnalyzed && currentImportAnalysis && (
          <section className="card knowledge-result">
            <span className="eyebrow">归位建议 · 系统不自动生效</span>
            <div className="knowledge-result-grid">
              <div><small>材料精义</small><h3>{currentImportAnalysis.essence}</h3><p>出处：{knowledgeSource}</p></div>
              <div><small>现有归处</small><h3>{currentImportAnalysis.target}</h3><p>{currentImportAnalysis.coverage === "covered" ? "现有体系能够较好承接这则材料。" : "现有体系只能部分承接，可能存在新的方法维度。"}</p></div>
              <div><small>演化建议</small><h3>{currentImportAnalysis.coverage === "covered" ? "适合作为小补丁" : "值得发起体系共创"}</h3><p>{currentImportAnalysis.recommendation}</p></div>
            </div>
            <div className="knowledge-actions"><button className="ghost-button" onClick={() => updateImportDisposition("pending")}>暂存候选</button><button className="ghost-button" onClick={() => updateImportDisposition("material")}>仅存材料</button><button className="ghost-button" onClick={() => updateImportDisposition("patch")}>收录为补丁</button><button className="primary-button" onClick={() => { openFrameworkEditor("version", currentImportAnalysis.target); go("framework"); }}>共创新版本 →</button></div>
          </section>
        )}
        <section className="card import-ledger">
          <SectionHeader eyebrow="候选材料簿" title="最近带回的思想" note="每一则材料都保留出处、札记和当前处理状态。" />
          {knowledgeImports.length === 0 ? <p className="empty-ledger">还没有材料。第一则思想，正等你带回来。</p> : knowledgeImports.slice(0, 6).map((item) => {
            const analysis = JSON.parse(item.analysisJson || "{}") as Partial<ImportAnalysis>;
            const status = item.disposition === "patch" ? "已收录补丁" : item.disposition === "material" ? "材料归档" : "等待检点";
            return <article className="import-row" key={item.id}><div><span>{status}</span><strong>{analysis.target || "待分析"}</strong></div><p>{item.content.slice(0, 96)}{item.content.length > 96 ? "…" : ""}</p><small>{item.source}</small><div className="import-row-actions"><button title="修订材料" onClick={() => setEditingImport({ ...item })}>✎ 修订</button><button title="移入回收站" onClick={() => void moveImportToTrash(item)}>⌫ 归藏</button></div></article>;
          })}
        </section>
      </>
    );
  }

  function renderAnalyze() {
    const questions: Array<{ question: string; rationale: string; basis: string }> = analysisFocus === "目的"
      ? ["我真正想达成什么？", "这个目的是否被更大的目的所约束？", "什么结果能证明目的已经实现？"].map((question) => ({ question, rationale: "从目的元素反推可验证的终点，避免把行动本身误当成目的。", basis: "思维元素：目的 × 标准：清晰性、重要性" }))
      : analysisFocus === "准确性"
        ? ["这句话可以被什么证据核验？", "信息来源是否可靠且可复查？", "我是否把推测写成了事实？"].map((question) => ({ question, rationale: "把抽象的准确性转成来源、复查和事实边界三个可执行动作。", basis: "思维标准：准确性 × 元素：信息" }))
        : ["我正在回答的核心问题究竟是什么？", "哪些依据支持它，哪些证据可能推翻它？", "还有谁会从不同立场理解这件事？"].map((question) => ({ question, rationale: "依次检查问题、证据和视角，覆盖一次整体分析最容易遗漏的三个转折点。", basis: "问题 × 清晰性；信息 × 准确性；观点 × 广度" }));
    return (
      <>
        <SectionHeader eyebrow="观照室 · QUICK ANALYSIS" title="临时放下一段文字，快速看清它" note="这里调用与思维记录相同的初步分析程序，但不会自动保存。分析完成后，由你决定归入记录或就此放下。" />
        <section className="analysis-studio">
          <article className="card analysis-input-card">
            <span className="card-kicker">待观照文本</span>
            <label className="analysis-record-link">从思维记录载入<select value={analysisRecordId} onChange={(event) => { const id = event.target.value; setAnalysisRecordId(id); setAnalysisSaveState(""); setModelAnalysis(null); const record = records.find((item) => item.id === id); if (record) setAnalysisText(record.content); setAnalysisComplete(false); }}><option value="">临时分析，不关联记录</option>{records.map((record) => <option value={record.id} key={record.id}>{record.title}</option>)}</select></label>
            <MarkdownComposer value={analysisText} onChange={(next) => { setAnalysisText(next); setAnalysisComplete(false); setAnalysisSaveState(""); }} placeholder="输入一段判断、决策、论证、阅读笔记或困惑；也可以上传文件或读取链接……" />
            <div className="focus-picker base-model-picker"><span>基座模型</span><select value={analysisBaseId} onChange={(event) => { setAnalysisBaseId(event.target.value); setAnalysisComplete(false); }}>{analysisBases.map((item) => <option value={item.id} key={item.id}>{item.name}{item.kind === "meta" ? " · 通用元认知" : " · 领域模型"}</option>)}</select><small>{analysisBases.find((item) => item.id === analysisBaseId)?.description || "选择分析本次文本时要调用的思维基座。"}</small></div>
            {modelError && <p className="form-warning">{modelError}</p>}
            <button className="primary-button" disabled={analysisText.trim().length < 10 || modelLoading} onClick={runModelAnalysis}>{modelLoading ? "DeepSeek 正在快速分析…" : "开始快速分析 →"}</button>
          </article>
          <aside className="card analysis-compass"><span>工作方式</span><strong>QUICK</strong><p>读取当前可执行流程<br />生成完整初步分析<br />结果默认不进入档案</p></aside>
        </section>
        {analysisComplete && modelAnalysis && (
          <section className="analysis-page quick-analysis-result">
            <section className="thinking-journey-overview card"><div><span className="card-kicker">快速分析 · 先抓住它真正想说什么</span><h3>{modelAnalysis.overview}</h3><p>下面直接呈现与思维记录初步分析相同的完整路径；保存时也会原样归档，而不是另写一份摘要。</p></div><div className="journey-destination"><span>暂时走到</span><strong>{modelAnalysis.focusFinding}</strong></div></section>
            <section className="human-thinking-path">{modelAnalysis.reasoningJourney.map((item, index) => <article className="card" key={`${item.step}-${index}`}><i>{String(index + 1).padStart(2, "0")}</i><div><span>{item.step}</span><h3>{item.thoughtMove}</h3><p>{item.from}</p><div className="thought-transition"><b>所以我暂时走到：</b>{item.to}</div><details><summary>为什么可以从这里走到下一步？</summary><p>{item.why}</p><small>调用的个人体系：{item.framework}</small></details></div></article>)}</section>
            <section className="turning-points"><article className="card"><span>已经站得住的部分</span>{modelAnalysis.strengths.map((item) => <p key={item}>＋ {item}</p>)}</article><article className="card"><span>还不能轻易跨过去的部分</span>{modelAnalysis.gaps.map((item) => <p key={item}>△ {item}</p>)}</article><article className="card"><span>下一步最小行动</span><strong>{modelAnalysis.nextStep}</strong></article></section>
            <section className="question-construction-lab"><header><span className="eyebrow">QUESTION MAKING · 启发式问题</span><h2>问题从理解受阻的地方长出来。</h2><p>这组问题及其完整构建思路，会与上面的分析路径一起保存。</p></header>{(modelAnalysis.questions.length ? modelAnalysis.questions : questions).map((item, index) => <article className="card" key={`${item.question}-${index}`}><div className="question-number">Q{index + 1}</div><div><h3>{item.question}</h3><details open><summary>这个问题是怎样一步一步长出来的？</summary><div className="question-birth-path"><span>观察原文</span><i>→</i><span>发现缺口</span><i>→</i><span>确定动作</span><i>→</i><span>收窄问题</span></div><p>{item.rationale}</p><blockquote>{item.basis}</blockquote></details></div></article>)}</section>
            <article className="card quick-focus-note"><span className="eyebrow">本次基座 · {analysisBases.find((item) => item.id === analysisBaseId)?.name || "万象思维基座"}</span><h2>{modelAnalysis.focusTitle}</h2><p>{modelAnalysis.focusFinding}</p><blockquote>{modelAnalysis.evidence || analysisText.slice(0, 120)}</blockquote></article>
            <section className="card quick-analysis-actions"><div><span className="eyebrow">SAVE OR RELEASE</span><h2>{analysisSaveState === "saved" ? "这份初步分析已经归档。" : "这份结果目前只存在于观照室。"}</h2><p>{analysisSaveState === "saved" ? "原文、完整路径、转折点和问题构建思路已经保存到思维记录。" : analysisRecordId ? "只有你确认后，它才会更新所关联的思维记录。" : "可以新建一条思维记录保存它，也可以不保留本次结果。"}</p></div><div>{analysisSaveState === "saved" ? <button className="primary-button" onClick={() => { const record = records.find((item) => item.id === analysisRecordId); if (record) { setSelectedRecord(record); go("records"); } }}>查看已保存记录 →</button> : <><button className="ghost-button" onClick={discardQuickAnalysis}>不保留本次结果</button><button className="primary-button" disabled={analysisSaveState === "saving"} onClick={() => void saveQuickAnalysis()}>{analysisSaveState === "saving" ? "正在保存…" : analysisRecordId ? "保存到关联记录" : "保存为新思维记录"}</button></>}</div></section>
          </section>
        )}
      </>
    );
  }

  function renderHistory() {
    const versions: FrameworkVersion[] = frameworkVersions.length ? frameworkVersions : [{ id: "base-v1", name: "Critical Thinking Base", version: "V1.0", description: "以《批判性思维工具》为起点，建立 8 个思维元素 × 9 项思维标准的基础结构。", definitionJson: "{}", status: "active", createdAt: "2026-07-01T00:00:00.000Z" }];
    const selected = historySelected ?? versions[0];
    return (
      <>
        <SectionHeader eyebrow="年轮志 · EVOLUTION" title="一座思维基座，是怎样长成的" note="版本保存结构性变化；小补丁保留日常积累。每一次改变都有缘由、内容与影响范围。" />
        <section className="history-layout">
          <div className="version-timeline">{versions.map((version, index) => <button className={`card version-node ${selected.id === version.id ? "active" : ""}`} key={version.id} onClick={() => setHistorySelected(version)}><span>{String(versions.length - index).padStart(2, "0")}</span><div><small>{new Date(version.createdAt).toLocaleDateString("zh-CN")}</small><strong>{version.name} {version.version}</strong><p>{version.description || "一次版本化调整。"}</p></div><i>{version.status === "active" ? "当前" : "历史"}</i></button>)}</div>
          <article className="card version-detail"><span className="eyebrow">版本检点</span><h2>{selected.version}</h2><p>{selected.description || "一次版本化调整。"}</p><div className="version-facts"><div><small>形成缘由</small><strong>{selected.version === "V1.0" ? "建立可操作的批判性思维骨架" : "来自一次材料导入或结构修订"}</strong></div><div><small>核心变化</small><strong>{selected.version === "V1.0" ? "确立元素 × 标准双轴模型" : "保留在该版本的定义快照中"}</strong></div><div><small>影响范围</small><strong>新分析默认采用；历史记录不回写</strong></div></div><button className="ghost-button" onClick={() => go("framework")}>回到体系全貌 →</button></article>
        </section>
      </>
    );
  }

  function renderTrash() {
    const remaining = (value?: string | null) => value ? Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)) : 30;
    return (
      <>
        <SectionHeader eyebrow="归藏处 · RECOVERY" title="回收站" note="删除内容会在这里保留 30 天。你可以恢复；到期后系统会自动清理。" action={<button className="ghost-button compact" onClick={() => void loadTrash()}>刷新</button>} />
        <section className="trash-grid">
          <article className="card trash-column"><div className="trash-column-head"><span>思维记录</span><strong>{trashRecords.length}</strong></div>{trashRecords.length === 0 ? <p className="empty-ledger">没有待清理的记录。</p> : trashRecords.map((record) => <div className="trash-item" key={record.id}><div><strong>{record.title}</strong><small>{remaining(record.deleteAfter)} 天后自动删除</small></div><p>{record.content.slice(0, 90)}{record.content.length > 90 ? "…" : ""}</p><footer><button onClick={() => void trashAction("record", record.id, "restore")}>恢复</button><button className="danger-text" onClick={() => void trashAction("record", record.id, "delete")}>彻底删除</button></footer></div>)}</article>
          <article className="card trash-column"><div className="trash-column-head"><span>知识材料</span><strong>{trashImports.length}</strong></div>{trashImports.length === 0 ? <p className="empty-ledger">没有待清理的材料。</p> : trashImports.map((item) => <div className="trash-item" key={item.id}><div><strong>{item.source}</strong><small>{remaining(item.deleteAfter)} 天后自动删除</small></div><p>{item.content.slice(0, 90)}{item.content.length > 90 ? "…" : ""}</p><footer><button onClick={() => void trashAction("import", item.id, "restore")}>恢复</button><button className="danger-text" onClick={() => void trashAction("import", item.id, "delete")}>彻底删除</button></footer></div>)}</article>
        </section>
      </>
    );
  }

  function renderFramework() {
    return (
      <>
        <SectionHeader
          eyebrow="观星台 · THE THINKING COMMONS"
          title="万象思维基座 · Critical Thinking Base V1.0"
          note="在这里看见体系的全貌、各部分的含义，以及它们如何共同支撑判断、分析与行动。"
          action={<div className="header-actions"><button className="ghost-button compact" onClick={() => setHelpOpen(true)}>请引路人 · 使用指南</button><button className="primary-button compact" onClick={() => openFrameworkEditor("version", "新版本")}>创建新版本</button></div>}
        />
        {versionSaved && <div className="success-banner"><span>✓</span><p><strong>{versionName} 草案已保存</strong>旧版本与历史评估保持不变。</p></div>}
        <section className="card framework-manifesto">
          <div><span className="eyebrow">基座总述</span><h2>思考不是答案的仓库，而是一套不断校正答案的秩序。</h2></div>
          <p>当前基座以《批判性思维工具》为第一块地基：先用八个“思维元素”还原一次思考由什么构成，再用九项“思维标准”检验每个环节做得怎样，最终把可靠证据汇聚为综合能力。未来的新书、新课与新经验，不是堆在旁边，而是以补丁或版本的方式融入这张可追溯的关系网。</p>
        </section>
        <section className="framework-hero card">
          <div className="framework-status"><span className="status-dot" /> 当前启用版本</div>
          <div className="framework-flow">
            <div><span>01</span><strong>思维元素</strong><small>怎样思考</small></div><i>→</i>
            <div><span>02</span><strong>思维标准</strong><small>完成得怎样</small></div><i>→</i>
            <div><span>03</span><strong>综合能力</strong><small>形成什么画像</small></div>
          </div>
          <p>底层是 8 × 9 的关系模型，但每次只评价情境相关且证据充分的组合。</p>
        </section>
        <FrameworkMindMap onEdit={(label) => openFrameworkEditor(label === "万象思维基座" || label === "候选与补丁" ? "version" : label.includes("标准") || qualityScores.some((item) => item.name === label) ? "standards" : label.includes("能力") || capabilities.some((item) => item.name === label) ? "capability" : "elements", label)} />
        <section className="framework-two-col">
          <article className="card">
            <SectionHeader eyebrow="Thinking Elements" title="8 个思维元素" note="描述一次思考由什么构成。" action={<button className="text-button" onClick={() => openFrameworkEditor("elements", "思维元素")}>管理元素 →</button>} />
            <div className="framework-items">
              {elements.map((item, index) => <div key={item.name}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong><small>{item.note}</small></div>)}
            </div>
          </article>
          <article className="card">
            <SectionHeader eyebrow="Intellectual Standards" title="9 个思维标准" note="评价这些思维环节的质量。" action={<button className="text-button" onClick={() => openFrameworkEditor("standards", "思维标准")}>管理标准 →</button>} />
            <div className="standard-tags">
              {qualityScores.map((item, index) => <button key={item.name} onClick={() => openFrameworkEditor("standards", item.name)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong><small>查看定义与证据规则</small></button>)}
            </div>
          </article>
        </section>
        <section className="card matrix-preview">
          <SectionHeader eyebrow="核心关系" title="Element × Standard 评估矩阵" note="灰色代表本次无证据，不等于低分。" action={<button className="text-button" onClick={() => openFrameworkEditor("relations", "评估关系")}>编辑关系 →</button>} />
          <div className="matrix-wrap">
            <div className="matrix">
              <div className="matrix-row matrix-head"><span>元素</span>{qualityScores.map((item) => <small key={item.name}>{item.name.slice(0, 2)}</small>)}</div>
              {elements.map((element, row) => (
                <div className="matrix-row" key={element.name}>
                  <strong>{element.name}</strong>
                  {qualityScores.map((standard, col) => {
                    const active = (row + col) % 4 === 0 || (row === 3 && col === 6) || (row === 7 && col === 5);
                    return <i key={standard.name} className={active ? "active" : ""} title={`${element.name} × ${standard.name}`} />;
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="framework-bottom-grid">
          <article className="card">
            <SectionHeader eyebrow="Higher-order Capabilities" title="综合能力映射" />
            {capabilities.map((item) => <div className="capability-map" key={item.name}><strong>{item.name}</strong><span>{item.name === "逻辑推理" ? "推理 · 假设 · 信息 → 逻辑性 · 准确性" : item.name === "决策能力" ? "目的 · 信息 · 结果 · 观点 → 深度 · 公正性" : "由相关元素与标准的证据组合形成"}</span><button onClick={() => openFrameworkEditor("capability", item.name)}>编辑</button></div>)}
          </article>
          <article className="card">
            <SectionHeader eyebrow="Scene Profiles" title="场景评估重点" />
            {["日常聊天", "听课与阅读", "学术讨论", "重要决策", "每日复盘"].map((item, index) => <div className="scene-profile" key={item}><span>{item}</span><p>{index === 0 ? "清晰性 · 公正性 · 观点" : index === 1 ? "问题 · 概念 · 信息 · 重要性" : index === 2 ? "假设 · 信息 · 推理 · 深度" : index === 3 ? "目的 · 假设 · 结果 · 广度" : "目的 · 判断 · 依据 · 假设 · 结果"}</p></div>)}
          </article>
        </section>
        <section className="card essence-questions">
          <SectionHeader eyebrow="体系精义" title="六问，穿过一次完整思考" note="问题不求多，只求能覆盖这座基座最重要的动作。" action={<button className="text-button" onClick={() => go("analyze")}>带着问题去分析 →</button>} />
          <div>{[
            ["定向", "我真正想达成什么，正在回答的核心问题又是什么？"],
            ["求证", "我依赖了哪些信息，它们准确、充分且可核验吗？"],
            ["澄义", "关键概念的边界是什么，我们是否在用同一个词说不同的事？"],
            ["探底", "结论依赖哪些未说出口的假设，推理链条是否成立？"],
            ["换位", "还有哪些合理观点，谁的利益与经验被我遗漏了？"],
            ["远眺", "如果判断成立或错误，短期与长期会发生什么？"],
          ].map(([name, question]) => <article key={name}><span>{name}</span><p>{question}</p></article>)}</div>
        </section>
        {frameworkEditor && (
          <div className="modal-backdrop" role="presentation">
            <form className="framework-modal card" onSubmit={saveFrameworkVersion}>
              <button type="button" className="modal-close" aria-label="关闭" onClick={() => setFrameworkEditor(null)}>×</button>
              <span className="eyebrow">版本化修改</span><h2>创建一个新版本草案</h2><p>旧版本和历史结果不会被覆盖。你可以先保存，再继续讨论与调整。</p>
              <label className="field-label">版本号<input value={versionName} onChange={(event) => setVersionName(event.target.value)} /></label>
              {frameworkEditor.kind === "version" ? (
                <label className="field-label">这次修改的理由<textarea value={versionNote} onChange={(event) => setVersionNote(event.target.value)} /></label>
              ) : (
                <>
                  <label className="field-label">编辑对象<input value={frameworkDraftTitle} onChange={(event) => setFrameworkDraftTitle(event.target.value)} /></label>
                  <label className="field-label">修改说明<textarea value={frameworkDraftBody} onChange={(event) => setFrameworkDraftBody(event.target.value)} /></label>
                </>
              )}
              {frameworkSaveError && <p className="form-warning">{frameworkSaveError}</p>}
              <div className="modal-note"><span>i</span><p>新版本确认启用后，未来记录默认使用它；旧记录仍保留当时的版本。</p></div>
              <div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setFrameworkEditor(null)}>取消</button><button className="primary-button" type="submit">保存 {versionName} 草案</button></div>
            </form>
          </div>
        )}
      </>
    );
  }

  void renderHistory;
  void renderFramework;
  const renderPage = () => {
    switch (activePage) {
      case "records": return renderRecords();
      case "new": return renderNewRecord();
      case "growth": return renderGrowth();
      case "topics": return renderTopics();
      case "cabinet": return <CabinetPage />;
      case "knowledge": return renderKnowledge();
      case "framework": return <CognitiveBasePage onOpenRecord={(id) => { const record = records.find((item) => item.id === id); if (record) { setSelectedRecord(record); setActivePage("records"); } }} />;
      case "history": return <BaseVersionHistory />;
      case "integration": return integrationRecord ? <IntegrationStudio record={integrationRecord} onBack={() => { setSelectedRecord(integrationRecord); setActivePage("records"); }} onApplied={() => { setRecords((items) => items.map((item) => item.id === integrationRecord.id ? { ...item, status: "integrated" } : item)); setIntegrationRecord(null); setActivePage("framework"); }} /> : <CognitiveBasePage />;
      case "analyze": return renderAnalyze();
      case "trash": return renderTrash();
      default: return renderDashboard();
    }
  };

  return (
    <div className="app-shell" style={{ "--content-visibility": Math.max(.04, 1 - sceneryFocus / 104) } as CSSProperties}>
      <aside className="sidebar">
        <button className="brand" onClick={() => go("dashboard")} aria-label="返回首页">
          <span className="brand-mark">序</span>
          <span><strong>序理</strong><small>THOUGHT LAB</small></span>
        </button>
        <nav aria-label="主导航">
          {navItems.map((item) => (
            <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => go(item.id)}>
              <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>
              {item.label}
              {item.id === "knowledge" && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-insight">
          <span className="insight-line" />
          <small>今日一句</small>
          <p>好的判断，不急于证明自己是对的。</p>
        </div>
        <div className="profile">
          <span className="profile-avatar">E</span>
          <span><strong>我的思维档案</strong><small>连续记录 18 天</small></span>
          <button aria-label="个人设置" onClick={() => setUtilityPanel("settings")}>···</button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">序</span><strong>序理</strong></div>
          <div className="breadcrumb"><span>序理</span><i>/</i><strong>{pageTitle}</strong></div>
          <div className="topbar-actions">
            <span className="date-label">{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</span>
            <button aria-label="搜索" onClick={() => go("records")}>⌕</button>
            <button aria-label="通知" className="notification-button" onClick={() => setUtilityPanel("notifications")}>·<i /></button>
          </div>
        </header>
        <main key={activePage} className={`page-content page-${activePage} page-transition-stage`}>
          {activePage !== "dashboard" && <PageAtmosphere page={activePage} title={pageTitle} />}
          {renderPage()}
        </main>
        <label className="background-focus-control" title="调低页面模块与文字的显现程度，专心欣赏壁纸">
          <span>赏景</span>
          <input type="range" min="0" max="100" step="1" value={sceneryFocus} onChange={(event) => changeSceneryFocus(Number(event.target.value))} aria-label="全页面内容透明度" />
          <output>{sceneryFocus}%</output>
        </label>
      </div>

      {helpOpen && (
        <div className="modal-backdrop help-backdrop" role="presentation">
          <section className="card help-assistant" role="dialog" aria-modal="true" aria-label="序理使用指南">
            <button className="modal-close" aria-label="关闭指南" onClick={() => setHelpOpen(false)}>×</button>
            <aside className="help-nav">
              <div className="guide-avatar">引</div><strong>序理引路人</strong><small>从一则材料，到一座会生长的思维基座</small>
              {[['start', '第一次来'], ['import', '导入与归位'], ['analyze', '用体系分析'], ['evolve', '补丁与版本']].map(([id, label]) => <button key={id} className={helpTopic === id ? "active" : ""} onClick={() => setHelpTopic(id as typeof helpTopic)}>{label}<span>→</span></button>)}
            </aside>
            <div className="help-content">
              {helpTopic === "start" && <><span className="eyebrow">欢迎来到序理</span><h2>这里不是资料仓库，而是你的思维操作系统。</h2><p>最简单的使用顺序是：在「行思录」留下自己的想法或外部知识，在「观照室」按需分析，在「磨砺场」复习旧知或分析今日新材料，最后到「年轮志」看见整座基座怎样长成。</p><div className="guide-map">{[["观星台", "看全貌"], ["行思录", "记录与输入"], ["观照室", "解问题"], ["年轮志", "看演化"], ["拾光橱", "藏句与图"], ["磨砺场", "双轨训练"]].map(([name, note]) => <div key={name}><strong>{name}</strong><span>{note}</span></div>)}</div><div className="guide-tip"><strong>第一次使用建议</strong><p>先保存一条真实记录。你可以就此结束，也可以生成一次完整初步分析；页面结果会原样进入记录。</p></div><button className="primary-button" onClick={() => { setHelpOpen(false); go("new"); }}>开始第一条记录 →</button></>}
              {helpTopic === "import" && <><span className="eyebrow">行思录指南</span><h2>知识输入和个人思考，现在属于同一种档案。</h2><ol className="guide-steps"><li><strong>选择来源</strong><p>直接输入、常见办公文档、PDF 或外部链接均可，同时填写出处和原始链接。</p></li><li><strong>边读边整理</strong><p>用富文本工具栏设置标题、加粗、下划线、高光和插图。</p></li><li><strong>写下札记与标签</strong><p>记录它为何重要，并用自己定义的标签和星级整理。</p></li><li><strong>决定是否分析</strong><p>仅保存会立即结束；选择分析后，完整结果会原样归入同一条记录。</p></li></ol><div className="guide-example"><small>示例</small><strong>《批判性思维工具》关于假设的段落</strong><p>可以标记为「阅读」「假设」和五星，再让当前基座流程生成完整初步分析。</p></div><button className="primary-button" onClick={() => { setHelpOpen(false); go("new"); }}>去行思录 →</button></>}
              {helpTopic === "analyze" && <><span className="eyebrow">观照室指南</span><h2>先整体看，再选择一束更聚焦的光。</h2><p>输入决策、论证、阅读笔记或困惑。DeepSeek 会严格使用当前基座：先还原八个思维元素，再只评价有文本证据的“元素 × 标准”组合。</p><div className="guide-example"><small>完整例子</small><strong>问题：我是否应该更换研究方向？</strong><p>先选择“整体分析”，看目的、信息、假设与后果是否完整；再选择“假设”，重点追问“新方向更有价值”依赖哪些尚未验证的前提。</p></div><div className="guide-tip"><strong>怎样读结果</strong><p>“暂不评价”并不是低分，而是原文没有足够证据。最有价值的动作通常是回答系统给出的三条启发式问题。</p></div><button className="primary-button" onClick={() => { setHelpOpen(false); go("analyze"); }}>去观照室 →</button></>}
              {helpTopic === "evolve" && <><span className="eyebrow">演化规则</span><h2>小变化留下补丁，大变化形成版本。</h2><div className="evolution-rule"><div><span>PATCH</span><strong>补丁</strong><p>补充定义、例子、反例、问题模板或使用说明，不改变体系主干。</p></div><div><span>VERSION</span><strong>版本</strong><p>新增元素、标准、关系或能力映射，会改变未来分析方式。</p></div><div><span>HOLD</span><strong>暂存</strong><p>有启发但证据不足，保留出处与札记，等待以后重新检点。</p></div></div><p>每次正式改版都保留旧版本；历史记录继续使用当时的分析基座，不会被新版本回写。</p><button className="primary-button" onClick={() => { setHelpOpen(false); go("history"); }}>查看年轮志 →</button></>}
            </div>
          </section>
        </div>
      )}

      {utilityPanel && <div className="modal-backdrop" role="presentation"><section className="framework-modal card utility-modal"><button className="modal-close" aria-label="关闭" onClick={() => setUtilityPanel(null)}>×</button>{utilityPanel === "settings" ? <><span className="eyebrow">系统设置</span><h2>模型与资料安全</h2><div className="settings-row"><span>分析模型</span><strong>DeepSeek V4 Flash</strong></div><div className="settings-row"><span>密钥保存</span><strong>仅服务端加密环境</strong></div><div className="settings-row"><span>数据原则</span><strong>原文先保存，模型结果可追溯</strong></div><p>密钥不会出现在浏览器或源码中。建议定期在 DeepSeek 控制台轮换密钥。</p></> : <><span className="eyebrow">通知</span><h2>今日没有必须处理的事项</h2><div className="notification-item"><strong>思维基座已接入 DeepSeek</strong><p>新材料归位和文本分析将使用当前正式体系作为约束。</p></div><div className="notification-item"><strong>候选材料等待检点</strong><p>进入拾穗门可查看暂存内容并决定是否收录。</p></div></>}</section></div>}

      {editingRecord && <div className="modal-backdrop" role="presentation"><section className="edit-modal unified-edit-modal card" role="dialog" aria-modal="true" aria-label="编辑思维档案"><button className="modal-close" aria-label="关闭" onClick={() => setEditingRecord(null)}>×</button><span className="eyebrow">再次打磨 · 修改会保留更新时间</span><h2>{editingTarget === "report" ? "编辑分析报告" : "编辑思维记录"}</h2><div className="edit-target-tabs"><button className={editingTarget === "record" ? "active" : ""} onClick={() => setEditingTarget("record")}>原始记录</button><button className={editingTarget === "report" ? "active" : ""} onClick={() => setEditingTarget("report")}>分析报告</button></div>{editingTarget === "record" ? <><div className="record-source-grid"><label className="field-label">标题<input value={editingRecord.title} onChange={(event) => setEditingRecord({ ...editingRecord, title: event.target.value })} /></label><label className="field-label">场景<select value={editingRecord.scene} onChange={(event) => setEditingRecord({ ...editingRecord, scene: event.target.value })}>{sceneOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">出处<input value={editingRecord.source || ""} onChange={(event) => setEditingRecord({ ...editingRecord, source: event.target.value })} /></label><label className="field-label">原始链接<input value={editingRecord.sourceUrl || ""} onChange={(event) => setEditingRecord({ ...editingRecord, sourceUrl: event.target.value })} /></label></div><MarkdownComposer compact value={editingRecord.content} onChange={(content) => setEditingRecord({ ...editingRecord, content })} placeholder="重新梳理这次思考…" /><label className="field-label">此刻札记<textarea value={editingRecord.note || ""} onChange={(event) => setEditingRecord({ ...editingRecord, note: event.target.value })} /></label><div className="record-source-grid"><label className="field-label">标签（逗号分隔）<input value={(() => { try { return (JSON.parse(editingRecord.tagsJson || "[]") as string[]).join(", "); } catch { return ""; } })()} onChange={(event) => setEditingRecord({ ...editingRecord, tagsJson: JSON.stringify(event.target.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean)) })} /></label><label className="field-label">重要性<select value={editingRecord.importance || 3} onChange={(event) => setEditingRecord({ ...editingRecord, importance: Number(event.target.value) })}>{[5,4,3,2,1].map((star) => <option value={star} key={star}>{"★".repeat(star)} · {star} 星</option>)}</select></label></div></> : <MarkdownComposer compact value={editingRecord.reportContent || ""} onChange={(reportContent) => setEditingRecord({ ...editingRecord, reportContent })} placeholder="分析报告可以继续整理、补充与排版…" />}<div className="modal-actions"><button className="ghost-button" onClick={() => setEditingRecord(null)}>取消</button><button className="primary-button" onClick={() => void saveRecordEdit()}>保存修改</button></div></section></div>}

      {editingImport && <div className="modal-backdrop" role="presentation"><section className="edit-modal card" role="dialog" aria-modal="true" aria-label="编辑知识材料"><button className="modal-close" aria-label="关闭" onClick={() => setEditingImport(null)}>×</button><span className="eyebrow">重新检点</span><h2>编辑知识材料</h2><label className="field-label">出处<input value={editingImport.source} onChange={(event) => setEditingImport({ ...editingImport, source: event.target.value })} /></label><MarkdownComposer compact value={editingImport.content} onChange={(content) => setEditingImport({ ...editingImport, content })} placeholder="编辑材料正文…" /><label className="field-label">札记<textarea value={editingImport.note} onChange={(event) => setEditingImport({ ...editingImport, note: event.target.value })} /></label><div className="modal-actions"><button className="ghost-button" onClick={() => setEditingImport(null)}>取消</button><button className="primary-button" onClick={() => void saveImportEdit()}>保存修改</button></div></section></div>}

      <nav className="mobile-nav" aria-label="移动端主导航">
        {navItems.slice(0, 5).map((item) => (
          <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => go(item.id)}>
            <span>{item.symbol}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
