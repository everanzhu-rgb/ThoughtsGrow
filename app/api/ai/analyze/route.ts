import { deepSeekJson, frameworkBrief } from "@/lib/deepseek";

type AnalysisResult = {
  overview: string;
  strengths: string[];
  gaps: string[];
  nextStep: string;
  focusTitle: string;
  focusFinding: string;
  evidence: string;
  questions: Array<{ question: string; rationale: string; basis: string }>;
  structure: Array<{ name: string; text: string }>;
  assessments: Array<{ element: string; standard: string; finding: string; evidence: string; confidence: "高" | "中" | "低" | "暂不评价" }>;
};

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 6) : [];
}

function normalizeResult(value: unknown): AnalysisResult {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const rawStructure = raw.structure;
  const structure = Array.isArray(rawStructure)
    ? rawStructure
    : rawStructure && typeof rawStructure === "object"
      ? Object.entries(rawStructure as Record<string, unknown>).map(([name, text]) => ({ name, text: String(text ?? "原文未提供") }))
      : [];
  const assessments = Array.isArray(raw.assessments) ? raw.assessments : [];
  return {
    overview: String(raw.overview || "模型未给出整体判断。"),
    strengths: strings(raw.strengths),
    gaps: strings(raw.gaps),
    nextStep: String(raw.nextStep || "继续补充证据后再分析。"),
    focusTitle: String(raw.focusTitle || "专题分析"),
    focusFinding: String(raw.focusFinding || "暂未形成明确判断。"),
    evidence: String(raw.evidence || "原文证据不足"),
    questions: (Array.isArray(raw.questions) ? raw.questions : []).map((item) => {
      if (typeof item === "string") return { question: item, rationale: "用于补足当前文本中尚未展开的关键环节。", basis: "当前专题与原文证据" };
      const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return { question: String(entry.question || "还可以怎样检验这个判断？"), rationale: String(entry.rationale || "用于补足当前推理链条。"), basis: String(entry.basis || "当前框架与原文证据") };
    }).slice(0, 4),
    structure: structure.map((item) => {
      const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return { name: String(entry.name || "未命名元素"), text: String(entry.text || "原文未提供") };
    }).slice(0, 8),
    assessments: assessments.map((item) => {
      const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        element: String(entry.element || "未指定元素"),
        standard: String(entry.standard || "未指定标准"),
        finding: String(entry.finding || "暂不评价"),
        evidence: String(entry.evidence || "原文证据不足"),
        confidence: (["高", "中", "低", "暂不评价"].includes(String(entry.confidence)) ? String(entry.confidence) : "低") as "高" | "中" | "低" | "暂不评价",
      };
    }).slice(0, 6),
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { text?: string; focus?: string; scene?: string };
    const text = payload.text?.trim();
    if (!text || text.length < 10) return Response.json({ error: "请至少输入 10 个字。" }, { status: 400 });
    const focus = payload.focus?.trim() || "整体分析";
    const rawResult = await deepSeekJson<unknown>([
      {
        role: "system",
        content: `${frameworkBrief}\n你是严谨的中文思维分析师。只能依据用户原文，不进行人格判断。必须输出 JSON，字段为 overview、strengths、gaps、nextStep、focusTitle、focusFinding、evidence、questions、structure、assessments。strengths/gaps 各 2-4 条；questions 为 2-4 个对象，每个对象必须包含 question（启发式问题）、rationale（完整解释如何从原文缺口、所选元素/标准和预期认知动作推导出这个问题，以及为何不问更宽泛的问题）、basis（明确列出所依据的原文证据与框架维度）。structure 使用八个思维元素，缺失内容明确写“原文未提供”；assessments 只保留有证据的 3-6 个组合。`,
      },
      { role: "user", content: `场景：${payload.scene || "未指定"}\n重点专题：${focus}\n待分析文本：\n${text}` },
    ]);
    return Response.json({ result: normalizeResult(rawResult), frameworkVersion: "Critical Thinking Base V1.0" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "模型分析失败" }, { status: 502 });
  }
}
