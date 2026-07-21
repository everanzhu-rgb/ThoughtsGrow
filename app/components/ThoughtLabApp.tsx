"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type PageKey =
  | "dashboard"
  | "records"
  | "new"
  | "growth"
  | "topics"
  | "knowledge"
  | "framework"
  | "history"
  | "analyze";

type FlowPhase =
  | "compose"
  | "saving"
  | "structure"
  | "assessment"
  | "review"
  | "training"
  | "result";

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
  frameworkVersion: string;
  createdAt: string;
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
  questions: string[];
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
};

const navItems: Array<{ id: PageKey; label: string; symbol: string }> = [
  { id: "framework", label: "观星台 · 体系全貌", symbol: "✦" },
  { id: "knowledge", label: "拾穗门 · 知识导入", symbol: "◇" },
  { id: "analyze", label: "观照室 · 体系分析", symbol: "◉" },
  { id: "history", label: "年轮志 · 版本历史", symbol: "◷" },
  { id: "records", label: "行思录 · 思维记录", symbol: "≡" },
  { id: "growth", label: "生长谱 · 成长分析", symbol: "↗" },
  { id: "topics", label: "磨砺场 · 训练专题", symbol: "◎" },
  { id: "new", label: "落笔 · 新建记录", symbol: "+" },
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

const structure = [
  { name: "目的", text: "在不放弃已有积累的前提下，判断是否值得调整研究方向。" },
  { name: "问题", text: "继续现有方向，还是先验证一个更有解释力的新方法？" },
  { name: "信息", text: "现有方向积累较多；新方法可能解释力更强；转换存在时间成本。" },
  { name: "解释与推理", text: "因为直接转向风险较高，而小规模验证成本可控，所以先试验再决定。" },
  { name: "概念", text: "“更有解释力”“积累”“转换风险”是三个关键概念。" },
  { name: "假设", text: "小规模验证足以判断新方法价值；现有进度允许短暂分流。" },
  { name: "结果与意义", text: "短期增加工作量，长期可能减少错误方向上的投入。" },
  { name: "观点", text: "主要站在研究效率与个人机会成本的角度看问题。" },
];

const assessments = [
  {
    pair: "问题 × 清晰性",
    score: 82,
    evidence: "充分",
    confidence: "高",
    quote: "我需要判断是继续现有方向，还是先验证新方法。",
    reason: "核心选择被明确提出，也包含可比较的行动路径。",
  },
  {
    pair: "信息 × 准确性",
    score: null,
    evidence: "不足",
    confidence: "低",
    quote: "新方法可能更有解释力。",
    reason: "没有提供数据、文献或验证结果，暂不判断准确性。",
  },
  {
    pair: "解释与推理 × 逻辑性",
    score: 78,
    evidence: "较充分",
    confidence: "中高",
    quote: "直接转向风险太高，所以我想先做一个小规模验证。",
    reason: "行动与风险判断能够连接，但“验证成功”的判据尚未说明。",
  },
  {
    pair: "假设 × 深度",
    score: 57,
    evidence: "充分",
    confidence: "高",
    quote: "先做一个小规模验证，就能知道是否值得转向。",
    reason: "识别到了验证需要，但没有检查小样本能否回答真正问题。",
  },
  {
    pair: "观点 × 广度",
    score: 58,
    evidence: "充分",
    confidence: "高",
    quote: "我主要担心自己的时间成本。",
    reason: "主要从个人效率出发，尚未纳入合作方或反对者的视角。",
  },
];

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

function GrowthChart({ large = false }: { large?: boolean }) {
  return (
    <div className={`growth-chart ${large ? "growth-chart-large" : ""}`}>
      <div className="chart-ylabels" aria-hidden="true">
        <span>90</span>
        <span>75</span>
        <span>60</span>
        <span>45</span>
      </div>
      <svg viewBox="0 0 720 230" preserveAspectRatio="none" role="img" aria-label="过去三个月稳定能力与训练后即时趋势">
        <line x1="0" y1="28" x2="720" y2="28" className="grid-line" />
        <line x1="0" y1="82" x2="720" y2="82" className="grid-line" />
        <line x1="0" y1="136" x2="720" y2="136" className="grid-line" />
        <line x1="0" y1="190" x2="720" y2="190" className="grid-line" />
        <path
          d="M12 170 C75 162, 86 150, 140 154 S238 128, 300 136 S405 96, 470 103 S560 78, 620 88"
          className="chart-area"
        />
        <path
          d="M12 170 C75 162, 86 150, 140 154 S238 128, 300 136 S405 96, 470 103 S560 78, 620 88"
          className="stable-line"
        />
        <path d="M620 88 C654 70, 677 44, 708 55" className="instant-line" />
        {[["12", "170"], ["140", "154"], ["300", "136"], ["470", "103"], ["620", "88"]].map(
          ([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="5" className="stable-point" />,
        )}
        <circle cx="708" cy="55" r="6" className="instant-point" />
      </svg>
      <div className="chart-xlabels">
        <span>5 月</span>
        <span>6 月</span>
        <span>7 月</span>
        <span>今天</span>
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

function EmptyScore() {
  return (
    <div className="score-empty">
      <span>—</span>
      <small>证据不足</small>
    </div>
  );
}

export function ThoughtLabApp() {
  const [activePage, setActivePage] = useState<PageKey>("framework");
  const [records, setRecords] = useState<StoredRecord[]>(sampleRecords);
  const [selectedRecord, setSelectedRecord] = useState<StoredRecord | null>(null);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>("compose");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scene, setScene] = useState("日常思考");
  const [mode, setMode] = useState<"record" | "review">("record");
  const [savedId, setSavedId] = useState("");
  const [saveWarning, setSaveWarning] = useState("");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [reviewTurn, setReviewTurn] = useState(0);
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewAnswers, setReviewAnswers] = useState<string[]>([]);
  const [trainingAnswer, setTrainingAnswer] = useState("");
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
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [modelAnalysis, setModelAnalysis] = useState<ModelAnalysis | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState("");
  const [recordQuery, setRecordQuery] = useState("");
  const [recordFilter, setRecordFilter] = useState<"all" | "trained" | "review" | "saved">("all");
  const [structureEdits, setStructureEdits] = useState<Record<string, string>>({});
  const [editingStructure, setEditingStructure] = useState<string | null>(null);
  const [topicDialog, setTopicDialog] = useState<"new" | "detail" | "practice" | null>(null);
  const [selectedTopicName, setSelectedTopicName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [utilityPanel, setUtilityPanel] = useState<"notifications" | "settings" | null>(null);
  const [growthRange, setGrowthRange] = useState("90");
  const [customTopics, setCustomTopics] = useState<typeof topics>([]);
  const [growthLayer, setGrowthLayer] = useState<"standards" | "elements" | "capabilities">("standards");
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

  useEffect(() => {
    fetch("/api/records")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { records?: StoredRecord[] }) => {
        if (data.records?.length) {
          const ids = new Set(data.records.map((item) => item.id));
          setRecords([...data.records, ...sampleRecords.filter((item) => !ids.has(item.id))]);
        }
      })
      .catch(() => {
        // The starter examples remain visible if local persistence is still warming up.
      });
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
  }, []);

  const pageTitle = useMemo(
    () => navItems.find((item) => item.id === activePage)?.label || "观星台",
    [activePage],
  );

  const filteredRecords = useMemo(() => records.filter((record) => {
    const query = recordQuery.trim().toLowerCase();
    const matchesQuery = !query || `${record.title} ${record.content} ${record.primaryIssue}`.toLowerCase().includes(query);
    const matchesFilter = recordFilter === "all"
      || (recordFilter === "trained" && record.status === "trained")
      || (recordFilter === "review" && record.status === "analyzed")
      || (recordFilter === "saved" && record.status === "saved");
    return matchesQuery && matchesFilter;
  }), [records, recordFilter, recordQuery]);

  const go = (page: PageKey) => {
    setActivePage(page);
    if (page !== "records") setSelectedRecord(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function requestModelAnalysis(text: string, focus: string, analysisScene = "未指定") {
    const response = await postJson("/api/ai/analyze", { text, focus, scene: analysisScene });
    const data = (await response.json()) as { error?: string; result?: ModelAnalysis };
    if (!response.ok || !data.result) throw new Error(data.error || "模型分析失败，请重试。");
    return data.result;
  }

  async function runModelAnalysis() {
    if (analysisText.trim().length < 10) return;
    setModelLoading(true);
    setModelError("");
    setAnalysisComplete(false);
    try {
      const result = await requestModelAnalysis(analysisText, analysisFocus);
      setModelAnalysis(result);
      setAnalysisComplete(true);
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "模型分析失败，请重试。");
    } finally {
      setModelLoading(false);
    }
  }

  async function startAnalysis(event: FormEvent) {
    event.preventDefault();
    if (content.trim().length < 10) {
      setSaveWarning("先写下一段完整想法吧，至少 10 个字。");
      return;
    }
    setSaveWarning("");
    setFlowPhase("saving");
    setAnalysisStep(0);

    try {
      const response = await postJson("/api/records", { title, content, scene, mode });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "保存失败，请稍后重试。");
      }
      const data = (await response.json()) as { record: StoredRecord };
      setSavedId(data.record.id);
      setRecords((current) => [data.record, ...current]);
    } catch (error) {
      setFlowPhase("compose");
      setSaveWarning(
        `${error instanceof Error ? error.message : "保存失败"} 原文仍保留在输入框中，请重试。`,
      );
      return;
    }

    try {
      setAnalysisStep(1);
      const result = await requestModelAnalysis(content, "整体分析", scene);
      setModelAnalysis(result);
      setAnalysisStep(3);
      setFlowPhase("structure");
    } catch (error) {
      setFlowPhase("compose");
      setSaveWarning(`${error instanceof Error ? error.message : "分析失败"} 原文已经保存，可稍后重试分析。`);
    }
  }

  async function confirmStructure() {
    setFlowPhase("assessment");
    if (savedId) {
      void postJson("/api/records/update", {
        action: "analysis",
        recordId: savedId,
        summary: modelAnalysis?.overview || "已完成思维结构分析。",
        primaryIssue: modelAnalysis?.gaps?.[0] || "暂无明确缺口",
        structure: (modelAnalysis?.structure || structure).map((item) => ({ ...item, text: structureEdits[item.name] ?? item.text })),
        assessments: modelAnalysis?.assessments || assessments,
        issues: modelAnalysis?.gaps || [],
      });
    }
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!reviewAnswer.trim()) return;
    const answer = reviewAnswer.trim();
    setReviewAnswers((items) => [...items, answer]);
    if (savedId) {
      void postJson("/api/records/update", {
        action: "conversation",
        recordId: savedId,
        kind: "review",
        role: "user",
        content: answer,
        turnNumber: reviewTurn + 1,
      });
    }
    setReviewAnswer("");
    if (reviewTurn === 0) {
      setReviewTurn(1);
    } else {
      setFlowPhase("training");
    }
  }

  function completeTraining(event: FormEvent) {
    event.preventDefault();
    if (!trainingAnswer.trim()) return;
    if (savedId) {
      void postJson("/api/records/update", {
        action: "training",
        recordId: savedId,
        focusElement: "观点",
        focusStandard: "广度",
        beforeScore: 58,
        afterScore: 72,
      });
    }
    setFlowPhase("result");
  }

  function resetFlow() {
    setFlowPhase("compose");
    setTitle("");
    setContent("");
    setScene("日常思考");
    setMode("record");
    setSavedId("");
    setReviewTurn(0);
    setReviewAnswer("");
    setReviewAnswers([]);
    setTrainingAnswer("");
    setSaveWarning("");
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

  function renderDashboard() {
    return (
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
            </div>
            <span className="framework-stamp">{selectedRecord.frameworkVersion}</span>
          </div>
          <section className="detail-grid">
            <article className="card raw-record-card">
              <span className="card-kicker">原始记录</span>
              <p>{selectedRecord.content}</p>
            </article>
            <article className="card">
              <span className="card-kicker">档案状态</span>
              <div className="archive-state">
                <div><span className="state-done">✓</span><p><strong>原文已保存</strong><small>保留原始输入，不被后续分析覆盖</small></p></div>
                <div><span className="state-done">✓</span><p><strong>结构已重建</strong><small>8 个思维元素</small></p></div>
                <div><span className={selectedRecord.status === "trained" ? "state-done" : "state-wait"}>{selectedRecord.status === "trained" ? "✓" : "·"}</span><p><strong>针对性训练</strong><small>{selectedRecord.status === "trained" ? "已完成 1 轮" : "尚未完成"}</small></p></div>
              </div>
            </article>
          </section>
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
          title="思维记录"
          note="原文、分析版本、复盘对话与训练结果都保留在同一条档案中。"
          action={<button className="primary-button compact" onClick={() => go("new")}>＋ 新建记录</button>}
        />
        <div className="record-toolbar card">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input aria-label="搜索记录" value={recordQuery} onChange={(event) => setRecordQuery(event.target.value)} placeholder="搜索标题、内容或问题…" />
          </label>
          <div className="filter-chips">
            <button className={`chip ${recordFilter === "all" ? "active" : ""}`} onClick={() => setRecordFilter("all")}>全部</button>
            <button className={`chip ${recordFilter === "trained" ? "active" : ""}`} onClick={() => setRecordFilter("trained")}>已训练</button>
            <button className={`chip ${recordFilter === "review" ? "active" : ""}`} onClick={() => setRecordFilter("review")}>待复盘</button>
            <button className={`chip ${recordFilter === "saved" ? "active" : ""}`} onClick={() => setRecordFilter("saved")}>仅保存</button>
          </div>
        </div>
        <div className="records-list">
          {filteredRecords.map((record) => (
            <button className="record-card card" key={record.id} onClick={() => setSelectedRecord(record)}>
              <div className="record-date">
                <strong>{new Date(record.createdAt).getDate()}</strong>
                <span>{new Intl.DateTimeFormat("zh-CN", { month: "short" }).format(new Date(record.createdAt))}</span>
              </div>
              <div className="record-body">
                <div className="record-meta">
                  <span className="pill">{record.scene}</span>
                  <span>{record.frameworkVersion}</span>
                </div>
                <h3>{record.title}</h3>
                <p>{record.summary || record.content.slice(0, 88)}</p>
                <div className="record-bottom">
                  <span><i className="tiny-dot" /> {record.primaryIssue || "等待分析"}</span>
                  <span className={`status-label status-${record.status}`}>
                    {record.status === "trained" ? "训练完成" : record.status === "analyzed" ? "已分析" : "已保存"}
                  </span>
                </div>
              </div>
              <span className="record-arrow" aria-hidden="true">→</span>
            </button>
          ))}
          {filteredRecords.length === 0 && <div className="card empty-search">没有找到符合条件的记录。</div>}
        </div>
      </>
    );
  }

  function renderNewRecord() {
    if (flowPhase === "compose") {
      return (
        <div className="new-record-shell">
          <div className="new-record-intro">
            <span className="eyebrow">低负担记录</span>
            <h1>先把真实的想法留下来。</h1>
            <p>不必整理得完美。系统会先保存原文，再帮助你重建思维结构。</p>
          </div>
          <form className="record-compose card" onSubmit={startAnalysis}>
            <div className="mode-switch" role="group" aria-label="记录模式">
              <button type="button" className={mode === "record" ? "active" : ""} onClick={() => setMode("record")}>
                <strong>记录模式</strong><span>只写内容，保持低负担</span>
              </button>
              <button type="button" className={mode === "review" ? "active" : ""} onClick={() => setMode("review")}>
                <strong>深度复盘</strong><span>记录后直接进入完整分析</span>
              </button>
            </div>
            <label className="field-label">
              标题 <span>可选</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="给这次思考一个名字" />
            </label>
            <fieldset className="scene-field">
              <legend>这次思考发生在</legend>
              <div className="scene-options">
                {sceneOptions.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={scene === item ? "active" : ""}
                    onClick={() => setScene(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field-label record-text-label">
              记录你的思考
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="你在想什么？做了怎样的判断？依据是什么？直接写下来就好…"
              />
              <span className="char-count">{content.length} 字</span>
            </label>
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
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setTitle("是否应该调整研究方向？");
                  setScene("重要决策");
                  setContent("我正在考虑是否要调整当前研究方向。现有方向已经积累了不少材料，继续做会更稳妥；但新方法似乎更有解释力，也可能更有长期价值。我主要担心转向会浪费前期投入，所以倾向先做一个小规模验证，如果结果理想再决定是否正式转向。");
                }}
              >
                填入示例
              </button>
              <button className="primary-button" type="submit">保存并开始分析 <span aria-hidden="true">→</span></button>
            </div>
            <p className="save-promise"><span aria-hidden="true">✓</span> 点击后先保存原文；即使分析失败，记录也不会丢失。</p>
          </form>
        </div>
      );
    }

    if (flowPhase === "saving") {
      const steps = ["原文已安全保存", "正在识别思维情境", "正在重建思维结构", "准备质量评估"];
      return (
        <div className="analysis-loading">
          <div className="analysis-orbit"><span /><i /></div>
          <span className="eyebrow">先结构，后质量</span>
          <h1>正在理解你的思考过程…</h1>
          <p>现在只还原你的思路，不做评价。</p>
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

    if (flowPhase === "structure") {
      return (
        <div className="analysis-page">
          <div className="analysis-breadcrumb"><span className="done">1 原文保存</span><i /><span className="current">2 结构重建</span><i /><span>3 质量评估</span><i /><span>4 复盘训练</span></div>
          <SectionHeader
            eyebrow="阶段一 · 不评价"
            title="我理解你的思考结构是…"
            note="请先确认系统有没有理解错。修正结构后，再进入质量评估。"
          />
          <div className="structure-summary card">
            <div className="summary-mark">结论</div>
            <div>
              <h3>{modelAnalysis?.overview || "系统已完成结构重建。"}</h3>
              <p>{modelAnalysis?.nextStep || "请确认结构是否符合你的本意。"}</p>
            </div>
          </div>
          <div className="structure-grid">
            {(modelAnalysis?.structure?.length ? modelAnalysis.structure : structure).map((item, index) => (
              <article className="structure-card card" key={item.name}>
                <div><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong></div>
                {editingStructure === item.name
                  ? <textarea className="structure-editor" value={structureEdits[item.name] ?? item.text} onChange={(event) => setStructureEdits((edits) => ({ ...edits, [item.name]: event.target.value }))} />
                  : <p>{structureEdits[item.name] ?? item.text}</p>}
                <button aria-label={`修改${item.name}`} onClick={() => setEditingStructure(editingStructure === item.name ? null : item.name)}>{editingStructure === item.name ? "完成" : "修改"}</button>
              </article>
            ))}
          </div>
          <div className="sticky-action card">
            <div><strong>这个结构符合你的本意吗？</strong><span>确认后才会进入证据驱动的质量评估。</span></div>
            <div><button className="ghost-button" onClick={() => setEditingStructure((modelAnalysis?.structure || structure)[0]?.name || null)}>有几处需要修改</button><button className="primary-button" onClick={confirmStructure}>确认结构，继续评估 →</button></div>
          </div>
        </div>
      );
    }

    if (flowPhase === "assessment") {
      return (
        <div className="analysis-page">
          <div className="analysis-breadcrumb"><span className="done">1 原文保存</span><i /><span className="done">2 结构重建</span><i /><span className="current">3 质量评估</span><i /><span>4 复盘训练</span></div>
          <SectionHeader
            eyebrow="阶段二 · 证据驱动"
            title="这次思考最值得看见的地方"
            note="本次只评估 5 个有情境意义的 Element × Standard 组合。其余维度不强行评分。"
          />
          <section className="assessment-overview card">
            <div>
              <span className="card-kicker">整体判断</span>
              <h3>{modelAnalysis?.overview || "已完成整体质量评估。"}</h3>
              <p>{modelAnalysis?.nextStep || "请根据证据继续复盘。"}</p>
            </div>
            <div className="overview-score"><strong>72</strong><span>本次可评估质量</span><small>证据覆盖 5 / 72 组合</small></div>
          </section>
          <div className="assessment-list">
            {(modelAnalysis?.assessments || []).map((item) => (
              <article className="assessment-card card" key={`${item.element}-${item.standard}`}>
                <div className="assessment-score">
                  <EmptyScore />
                </div>
                <div className="assessment-main">
                  <div className="assessment-title"><h3>{item.element} × {item.standard}</h3><span className="evidence-badge evidence-strong">证据分析</span></div>
                  <blockquote>“{item.evidence}”</blockquote>
                  <p>{item.finding}</p>
                </div>
                <div className="confidence"><span>判断信心</span><strong>{item.confidence}</strong></div>
              </article>
            ))}
          </div>
          <section className="card issue-card">
            <div className="issue-index">核心问题 01</div>
            <div>
              <span className="eyebrow">模型识别的主要缺口</span>
              <h2>{modelAnalysis?.gaps?.[0] || "当前没有足够证据形成主要缺口判断。"}</h2>
              <p>{modelAnalysis?.focusFinding || "继续补充文本证据后再判断。"}</p>
            </div>
            <div className="issue-direction"><span>建议方向</span><strong>{modelAnalysis?.nextStep || "继续补充证据。"}</strong></div>
          </section>
          <div className="sticky-action card">
            <div><strong>下一步：只聚焦一个问题</strong><span>教练会一次问一个问题，不把几十项检查同时抛给你。</span></div>
            <button className="primary-button" onClick={() => setFlowPhase("review")}>开始深度复盘 →</button>
          </div>
        </div>
      );
    }

    if (flowPhase === "review") {
      const question = modelAnalysis?.questions?.[reviewTurn]
        || (reviewTurn === 0 ? "哪一项证据最可能改变你当前的判断？" : "你还遗漏了谁的观点或哪一种后果？");
      return (
        <div className="coach-page">
          <div className="coach-header">
            <button className="back-button" onClick={() => setFlowPhase("assessment")}>← 返回分析</button>
            <span>深度复盘 · 第 {reviewTurn + 1} / 2 轮</span>
          </div>
          <div className="coach-layout">
            <aside className="coach-context card">
              <span className="eyebrow">当前焦点</span>
              <h3>观点 × 广度</h3>
              <p>目标不是反驳自己，而是看见当前框架之外仍然成立的解释。</p>
              <div className="coach-progress"><i style={{ height: `${reviewTurn === 0 ? 50 : 100}%` }} /></div>
            </aside>
            <main className="coach-conversation">
              <div className="coach-message">
                <span className="coach-avatar">序</span>
                <div>
                  <span>思维教练</span>
                  <p>{question}</p>
                  <small>{reviewTurn === 0 ? "请尽量构建一个你自己也认同其力量的理由。" : "寻找会改变决策的边界条件。"}</small>
                </div>
              </div>
              {reviewAnswers.map((answer, index) => (
                <div className="user-message" key={index}><span>你的回答</span><p>{answer}</p></div>
              ))}
              <form className="coach-answer card" onSubmit={submitReview}>
                <textarea value={reviewAnswer} onChange={(event) => setReviewAnswer(event.target.value)} placeholder="写下你此刻真实的回答…" autoFocus />
                <div><span>{reviewAnswer.length} 字</span><button className="primary-button" type="submit" disabled={!reviewAnswer.trim()}>提交回答，继续 →</button></div>
              </form>
            </main>
          </div>
        </div>
      );
    }

    if (flowPhase === "training") {
      return (
        <div className="training-page">
          <div className="training-heading">
            <span className="eyebrow">针对性训练 · 观点 × 广度</span>
            <h1>构建最强版本的反方观点</h1>
            <p>把刚才的发现转化为一次短练习。只练一个标准，不增加额外认知负担。</p>
          </div>
          <form className="training-card card" onSubmit={completeTraining}>
            <div className="training-side">
              <span>练习 01</span>
              <strong>Steelman</strong>
              <small>强钢人论证</small>
            </div>
            <div className="training-content">
              <h2>请替“现在不应该调整研究方向”写一段最强论证。</h2>
              <p>至少包含：一个核心理由、一条你需要认真对待的证据，以及一个会让对方改变主意的条件。</p>
              <div className="training-hints">
                <span>核心理由</span><i>+</i><span>关键证据</span><i>+</i><span>改变条件</span>
              </div>
              <textarea value={trainingAnswer} onChange={(event) => setTrainingAnswer(event.target.value)} placeholder="从反方的立场开始：现在不应该转向，因为…" />
              <div className="training-actions"><span>{trainingAnswer.length} 字</span><button className="primary-button" type="submit" disabled={!trainingAnswer.trim()}>完成训练并重新评估 →</button></div>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="result-page">
        <div className="result-hero">
          <span className="result-check">✓</span>
          <span className="eyebrow">一轮训练已完成</span>
          <h1>你不仅补充了反方观点，也说清了什么证据会改变判断。</h1>
          <p>这是一次有证据支持的即时变化，但还需要未来真实记录验证，暂不视为稳定提升。</p>
        </div>
        <section className="card comparison-card">
          <SectionHeader eyebrow="即时再评估" title="训练前 vs 训练后" note="虚线结果会进入成长曲线，但不覆盖稳定实线。" />
          <div className="comparison-layout">
            <div className="before-score"><span>训练前</span><strong>58</strong><small>观点 × 广度</small></div>
            <div className="comparison-arrow"><span>+14</span><i>→</i><small>即时变化</small></div>
            <div className="after-score"><span>训练后</span><strong>72</strong><small>暂时趋势</small></div>
          </div>
          <div className="comparison-notes">
            <div><span>改善</span><p>能够完整陈述反方理由，并给出可验证的证据条件。</p></div>
            <div><span>仍需观察</span><p>未来真实决策中，是否会在形成倾向前主动做这一步。</p></div>
          </div>
        </section>
        <section className="card topic-match-card">
          <div><span className="eyebrow">专题匹配建议</span><h2>这次训练与「构建最强反方观点」高度相关</h2><p>相似点：都聚焦观点 × 广度；本次新增了“改变条件”的具体案例。系统不会自动加入，最终由你决定。</p></div>
          <div className="topic-match-actions"><button className="ghost-button" onClick={() => resetFlow()}>不加入</button><button className="ghost-button" onClick={() => { setNewTopicName(""); setTopicDialog("new"); }}>新建专题</button><button className="primary-button" onClick={() => { setSelectedTopicName("构建最强反方观点"); setTopicDialog("detail"); }}>确认加入专题</button></div>
        </section>
        <div className="result-actions"><button className="ghost-button" onClick={() => go("growth")}>查看成长曲线</button><button className="primary-button" onClick={resetFlow}>完成并返回记录</button></div>
      </div>
    );
  }

  function renderGrowth() {
    return (
      <>
        <SectionHeader
          eyebrow="长期成长"
          title="成长分析"
          note="把质量标准、结构习惯和综合能力分层观察，避免一个总分掩盖真正变化。"
        />
        <div className="layer-tabs" role="tablist" aria-label="成长分析层级">
          <button className={growthLayer === "standards" ? "active" : ""} onClick={() => setGrowthLayer("standards")}>思维标准</button>
          <button className={growthLayer === "elements" ? "active" : ""} onClick={() => setGrowthLayer("elements")}>思维元素</button>
          <button className={growthLayer === "capabilities" ? "active" : ""} onClick={() => setGrowthLayer("capabilities")}>综合能力</button>
        </div>
        <section className="card growth-main-card">
          <div className="growth-card-head">
            <div><span className="card-kicker">{growthLayer === "standards" ? "9 项质量标准" : growthLayer === "elements" ? "8 个结构元素" : "5 项高阶能力"}</span><h2>{growthLayer === "standards" ? "清晰性与深度提升最明显" : growthLayer === "elements" ? "主动识别假设仍是主要瓶颈" : "反思能力保持领先"}</h2></div>
            <select aria-label="时间范围" value={growthRange} onChange={(event) => setGrowthRange(event.target.value)}><option value="30">最近 30 天</option><option value="90">最近 90 天</option><option value="365">最近一年</option></select>
          </div>
          <GrowthChart large />
          <div className="growth-insight"><span>观察</span><p>{growthRange === "30" ? "最近 30 天的记录显示，问题界定开始更加稳定。" : growthRange === "365" ? "年度样本仍在积累；当前改善主要集中在清晰性和深度。" : "最近 90 天，真实记录中的问题界定更加稳定；训练后的即时提升仍需后续证据转为实线。"}</p></div>
        </section>
        <section className="metrics-grid">
          {(growthLayer === "standards" ? qualityScores : growthLayer === "elements" ? elements.map((item) => ({ name: item.name, score: item.level, change: item.level > 70 ? 4 : 1 })) : capabilities.map((item) => ({ name: item.name, score: item.score, change: item.delta }))).map((item) => (
            <article className="card metric-card" key={item.name}>
              <div><span>{item.name}</span><small className="positive">+{item.change}</small></div>
              <strong>{item.score}</strong>
              <div className="metric-track"><i style={{ width: `${item.score}%` }} /></div>
              <p>{item.score >= 78 ? "稳定优势" : item.score >= 68 ? "持续积累" : "当前训练重点"}</p>
            </article>
          ))}
        </section>
      </>
    );
  }

  function renderTopics() {
    return (
      <>
        <SectionHeader
          eyebrow="长期训练档案"
          title="训练专题"
          note="围绕反复出现的问题积累案例、训练与变化，而不是随机做题。"
          action={<button className="primary-button compact" onClick={() => { setNewTopicName(""); setTopicDialog("new"); }}>＋ 新建专题</button>}
        />
        <section className="weekly-focus card">
          <div className="weekly-number">07</div>
          <div><span className="eyebrow">本周聚焦</span><h2>看见另一种解释</h2><p>一次只训练一个主要标准：广度。把“寻找反方”变成形成判断前的自然动作。</p></div>
          <div className="weekly-goal"><span>本周目标</span><strong>3 / 5</strong><div><i style={{ width: "60%" }} /></div></div>
          <button className="primary-button" onClick={() => { setSelectedTopicName("看见另一种解释"); setTopicDialog("practice"); }}>开始 8 分钟练习 →</button>
        </section>
        <div className="topic-grid">
          {[...topics, ...customTopics].map((topic, index) => (
            <article className="topic-card card" key={topic.name}>
              <div className="topic-card-top"><span className="topic-number">0{index + 1}</span><span className="pill sage">{index === 0 ? "进行中" : "已建立"}</span></div>
              <h3>{topic.name}</h3><span className="topic-focus">{topic.focus}</span><p>{topic.note}</p>
              <div className="topic-progress"><div><i style={{ width: `${topic.progress}%` }} /></div><span>{topic.sessions} 次训练</span></div>
              <button className="text-button" onClick={() => { setSelectedTopicName(topic.name); setTopicDialog("detail"); }}>打开专题 →</button>
            </article>
          ))}
        </div>
        <section className="card pattern-library">
          <SectionHeader eyebrow="长期识别" title="问题模式库" note="同一种问题在不同场景中的证据被持续归档。" />
          <div className="pattern-table">
            <div className="pattern-table-head"><span>问题模式</span><span>Element × Standard</span><span>出现次数</span><span>改善趋势</span></div>
            {problems.map((problem) => (
              <div className="pattern-table-row" key={problem.name}><strong>{problem.name}</strong><span>{problem.pair}</span><span>{problem.count} 次</span><span className="positive">{problem.trend}</span></div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderKnowledge() {
    return (
      <>
        <SectionHeader eyebrow="拾穗门 · INGESTION" title="让每一次阅读，都成为体系的新枝叶" note="提交内容、出处与当下札记。系统先判断它与现有基座的关系，再由你决定收录、暂存或共创新版本。" />
        <section className="knowledge-layout">
          <article className="card knowledge-input">
            <span className="card-kicker">一则新材料</span>
            <h2>把值得留下的思想带回来</h2>
            <p>书籍、论坛、课程、论文、谈话或你自己的领悟都可以成为材料。</p>
            <label className="field-label">出处<input value={knowledgeSource} onChange={(event) => setKnowledgeSource(event.target.value)} placeholder="例如：《批判性思维工具》第三章 / 课程链接" /></label>
            <textarea value={knowledgeText} onChange={(event) => setKnowledgeText(event.target.value)} placeholder="粘贴关于思维理论、评估标准或训练方法的内容…" />
            <label className="field-label">此刻札记<textarea className="knowledge-note" value={knowledgeNote} onChange={(event) => setKnowledgeNote(event.target.value)} placeholder="它为什么触动你？你认为它可能改变什么？" /></label>
            {knowledgeMessage && <p className="form-warning">{knowledgeMessage}</p>}
            <div><span>{knowledgeText.length} 字</span><button className="primary-button" disabled={knowledgeText.trim().length < 10 || !knowledgeSource.trim()} onClick={analyzeKnowledgeImport}>与现有基座对照 →</button></div>
          </article>
          <aside className="card knowledge-principle">
            <span className="principle-mark">慎</span>
            <h3>先理解，后归位；先共创，再改版</h3>
            <p>任何材料都不会静默改变正式基座。小补丁保留出处，大变化形成版本，每一步都可追溯。</p>
            <div className="ingestion-steps"><span>01 对照覆盖</span><span>02 寻找归处</span><span>03 决定命运</span></div>
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
            return <article className="import-row" key={item.id}><div><span>{status}</span><strong>{analysis.target || "待分析"}</strong></div><p>{item.content.slice(0, 72)}{item.content.length > 72 ? "…" : ""}</p><small>{item.source}</small></article>;
          })}
        </section>
      </>
    );
  }

  function renderAnalyze() {
    const focusOptions = ["整体分析", ...elements.map((item) => item.name), ...qualityScores.map((item) => item.name)];
    const focusIsStandard = qualityScores.some((item) => item.name === analysisFocus);
    const questions = analysisFocus === "目的"
      ? ["我真正想达成什么？", "这个目的是否被更大的目的所约束？", "什么结果能证明目的已经实现？"]
      : analysisFocus === "准确性"
        ? ["这句话可以被什么证据核验？", "信息来源是否可靠且可复查？", "我是否把推测写成了事实？"]
        : ["我正在回答的核心问题究竟是什么？", "哪些依据支持它，哪些证据可能推翻它？", "还有谁会从不同立场理解这件事？"];
    return (
      <>
        <SectionHeader eyebrow="观照室 · APPLICATION" title="用整座思维基座，照见一个真实问题" note="先做整体结构扫描，再选择一个元素或标准深入追问。分析依据始终显示在结果旁边。" />
        <section className="analysis-studio">
          <article className="card analysis-input-card">
            <span className="card-kicker">待观照文本</span>
            <textarea value={analysisText} onChange={(event) => { setAnalysisText(event.target.value); setAnalysisComplete(false); }} placeholder="输入一段判断、决策、论证、阅读笔记或困惑……" />
            <div className="focus-picker"><span>本次重点</span><select value={analysisFocus} onChange={(event) => { setAnalysisFocus(event.target.value); setAnalysisComplete(false); }}>{focusOptions.map((item) => <option key={item}>{item}</option>)}</select></div>
            {modelError && <p className="form-warning">{modelError}</p>}
            <button className="primary-button" disabled={analysisText.trim().length < 10 || modelLoading} onClick={runModelAnalysis}>{modelLoading ? "DeepSeek 正在观照…" : "开始体系分析 →"}</button>
          </article>
          <aside className="card analysis-compass"><span>当前基座</span><strong>8 × 9</strong><p>8 个思维元素<br />9 项思维标准<br />1 个可版本追溯的分析依据</p></aside>
        </section>
        {analysisComplete && modelAnalysis && (
          <section className="analysis-report">
            <article className="card report-overview"><span className="eyebrow">整体观照</span><h2>{modelAnalysis.overview}</h2><div className="report-columns"><div><small>结构亮点</small><p>{modelAnalysis.strengths.join("；") || "暂未识别到足够证据。"}</p></div><div><small>关键缺口</small><p>{modelAnalysis.gaps.join("；") || "暂未识别到足够证据。"}</p></div><div><small>下一步</small><p>{modelAnalysis.nextStep}</p></div></div></article>
            <article className="card focus-report"><span className="eyebrow">专题深描 · {analysisFocus}</span><h2>{modelAnalysis.focusTitle || (focusIsStandard ? `用“${analysisFocus}”检验这段思考的质量` : `追踪“${analysisFocus}”在文本中的位置`)}</h2><p>{modelAnalysis.focusFinding}</p><p className="evidence-quote">“{modelAnalysis.evidence || analysisText.slice(0, 120)}”</p><div className="heuristic-box"><small>启发式追问</small><ul>{(modelAnalysis.questions.length ? modelAnalysis.questions : questions).map((question) => <li key={question}>{question}</li>)}</ul></div><p className="analysis-basis">分析依据：Critical Thinking Base V1.0 · {analysisFocus} · DeepSeek</p></article>
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

  function renderFramework() {
    return (
      <>
        <SectionHeader
          eyebrow="观星台 · THE THINKING COMMONS"
          title="万象思维基座 · Critical Thinking Base V1.0"
          note="在这里看见体系的全貌、各部分的含义，以及它们如何共同支撑判断、分析与行动。"
          action={<button className="primary-button compact" onClick={() => openFrameworkEditor("version", "新版本")}>创建新版本</button>}
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

  const renderPage = () => {
    switch (activePage) {
      case "records": return renderRecords();
      case "new": return renderNewRecord();
      case "growth": return renderGrowth();
      case "topics": return renderTopics();
      case "knowledge": return renderKnowledge();
      case "framework": return renderFramework();
      case "history": return renderHistory();
      case "analyze": return renderAnalyze();
      default: return renderDashboard();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => go("framework")} aria-label="返回体系全貌">
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
        <main className={`page-content page-${activePage}`}>{renderPage()}</main>
      </div>

      {utilityPanel && <div className="modal-backdrop" role="presentation"><section className="framework-modal card utility-modal"><button className="modal-close" aria-label="关闭" onClick={() => setUtilityPanel(null)}>×</button>{utilityPanel === "settings" ? <><span className="eyebrow">系统设置</span><h2>模型与资料安全</h2><div className="settings-row"><span>分析模型</span><strong>DeepSeek V4 Flash</strong></div><div className="settings-row"><span>密钥保存</span><strong>仅服务端加密环境</strong></div><div className="settings-row"><span>数据原则</span><strong>原文先保存，模型结果可追溯</strong></div><p>密钥不会出现在浏览器或源码中。建议定期在 DeepSeek 控制台轮换密钥。</p></> : <><span className="eyebrow">通知</span><h2>今日没有必须处理的事项</h2><div className="notification-item"><strong>思维基座已接入 DeepSeek</strong><p>新材料归位和文本分析将使用当前正式体系作为约束。</p></div><div className="notification-item"><strong>候选材料等待检点</strong><p>进入拾穗门可查看暂存内容并决定是否收录。</p></div></>}</section></div>}

      {topicDialog && <div className="modal-backdrop" role="presentation"><section className="framework-modal card topic-modal"><button className="modal-close" aria-label="关闭" onClick={() => setTopicDialog(null)}>×</button><span className="eyebrow">{topicDialog === "new" ? "建立专题" : topicDialog === "practice" ? "八分钟磨砺" : "专题档案"}</span><h2>{topicDialog === "new" ? "给一个长期问题命名" : selectedTopicName}</h2>{topicDialog === "new" ? <><label className="field-label">专题名称<input value={newTopicName} onChange={(event) => setNewTopicName(event.target.value)} placeholder="例如：识别隐含假设" /></label><label className="field-label">训练焦点<input value="观点 × 广度" readOnly /></label><div className="modal-actions"><button className="ghost-button" onClick={() => setTopicDialog(null)}>取消</button><button className="primary-button" disabled={!newTopicName.trim()} onClick={() => { setCustomTopics((items) => [...items, { name: newTopicName.trim(), focus: "观点 × 广度", sessions: 0, progress: 0, note: "从真实记录中持续积累案例与训练。" }]); setTopicDialog(null); }}>创建专题</button></div></> : topicDialog === "practice" ? <><p>练习：为你当前最相信的一个判断，写出一个足以让你犹豫的反方解释，并指出什么证据会支持它。</p><textarea className="topic-practice-input" placeholder="先完整写出反方观点，再补充证据条件……" /><div className="modal-actions"><button className="ghost-button" onClick={() => setTopicDialog(null)}>稍后再练</button><button className="primary-button" onClick={() => setTopicDialog(null)}>完成本次练习</button></div></> : <><p>这个专题围绕「观点 × 广度」持续积累真实案例。打开一条记录开始练习，或继续使用本周训练。</p><div className="version-facts"><div><small>累计训练</small><strong>5 次</strong></div><div><small>当前阶段</small><strong>从寻找反例进阶到重构对方论证</strong></div></div><button className="primary-button" onClick={() => setTopicDialog("practice")}>开始练习 →</button></>}</section></div>}

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
