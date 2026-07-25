import { deepSeekJson, frameworkBrief } from "@/lib/deepseek";
import { activeAnalysisFlow, activeBaseBrief, type ActiveFlow } from "@/lib/base-context";

type AnalysisResult = {
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
  assessments: Array<{ element: string; standard: string; finding: string; evidence: string; confidence: "高" | "中" | "低" | "暂不评价" }>;
};

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 6) : [];
}

function normalizeResult(value: unknown, flow: ActiveFlow | null): AnalysisResult {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const rawStructure = raw.structure;
  const structure = Array.isArray(rawStructure)
    ? rawStructure
    : rawStructure && typeof rawStructure === "object"
      ? Object.entries(rawStructure as Record<string, unknown>).map(([name, text]) => ({ name, text: String(text ?? "原文未提供") }))
      : [];
  const assessments = Array.isArray(raw.assessments) ? raw.assessments : [];
  const rawJourney = (Array.isArray(raw.reasoningJourney) ? raw.reasoningJourney : []).map((item, index) => {
    const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { step: String(entry.step || `第 ${index + 1} 步`), from: String(entry.from || "从原文可见信息开始"), thoughtMove: String(entry.thoughtMove || "识别并检验"), to: String(entry.to || "形成一个可继续验证的理解"), framework: String(entry.framework || "当前可执行流程"), why: String(entry.why || "为了让推理过程可检查、可复用。") };
  });
  const reasoningJourney = flow?.steps.length ? flow.steps.map((step, index) => {
    const generated = rawJourney.find((item) => item.step.includes(step.title)) || rawJourney[index];
    return { step: step.title, from: generated?.from || "从上一步结论与原文证据出发", thoughtMove: generated?.thoughtMove || `回答流程问题：${step.question}`, to: generated?.to || "这一步尚未得到足够证据，需要保留未知。", framework: `${flow.name} · 第 ${index + 1} 步`, why: generated?.why || `${step.why}；完成标准：${step.done}` };
  }) : rawJourney.slice(0, 10);
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
    reasoningJourney,
    suggestedTitle: String(raw.suggestedTitle || ""),
    suggestedScene: String(raw.suggestedScene || "日常思考"),
    suggestedTags: strings(raw.suggestedTags).slice(0, 6),
    suggestedNote: String(raw.suggestedNote || ""),
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
    const [personalBase, activeFlow] = await Promise.all([activeBaseBrief(), activeAnalysisFlow()]);
    const flowInstruction = activeFlow ? `当前必须执行的分析流程是“${activeFlow.name}”。reasoningJourney 必须严格包含 ${activeFlow.steps.length} 步，顺序和 step 名称一字不改，不得新增、合并或跳过：\n${activeFlow.steps.map((step, index) => `${index + 1}. ${step.title}｜核心问题：${step.question}｜为什么：${step.why}｜完成标准：${step.done}`).join("\n")}\n每一步的 from、thoughtMove、to、why 都必须针对本次原文写具体分析，不能只复述流程说明。` : "当前没有可执行流程；使用最小、连贯且不跳步的分析路径。";
    const rawResult = await deepSeekJson<unknown>([
      {
        role: "system",
        content: `${frameworkBrief}\n${personalBase}
你是一位极其耐心、严谨、善于教学的中文思维分析师。只能依据用户原文，不进行人格判断，也不能用结论替代推导。
你的读者暂时不知道怎样思考。请从“原文直接说了什么”开始，像扶着初学者走楼梯一样，一步一步走到对文本的本质理解。任何一步都不得跳跃：每一步都要写清楚从什么信息出发、做了什么认知动作、得到什么中间结论、为什么可以这样移动。语言必须通俗、具体、连贯。
${flowInstruction}
必须输出 JSON，字段为 overview、strengths、gaps、nextStep、focusTitle、focusFinding、evidence、questions、reasoningJourney、suggestedTitle、suggestedScene、suggestedTags、suggestedNote、structure、assessments。
reasoningJourney 的每个对象包含 step、from、thoughtMove、to、framework、why，必须服从上面给出的当前可执行流程。没有证据时明确说明缺什么，不能臆测。
questions 为 2-4 个对象。每个对象必须包含 question、rationale、basis。rationale 要把“观察到的原文现象 → 对应框架维度 → 发现的缺口或张力 → 希望触发的认知动作 → 最终措辞”完整展开，并解释为什么这个问法比宽泛问题更精确。basis 要逐项列出原文证据、涉及的思维元素与标准。目标不仅是给问题，更是教会用户以后怎样独立构建同类高质量问题。
structure 使用全部八个思维元素，缺失内容明确写“原文未提供”；assessments 保留有证据的 4-8 个组合，并解释证据如何支持判断。strengths/gaps 各 2-5 条。
suggestedTitle 要简洁具体；suggestedScene 是一个适合作为检索标签的情境名；suggestedTags 为 3-6 个可检索标签；suggestedNote 用一句话说明这条记录值得留下的原因。`,
      },
      { role: "user", content: `场景：${payload.scene || "未指定"}\n重点专题：${focus}\n待分析文本：\n${text}` },
    ]);
    return Response.json({ result: normalizeResult(rawResult, activeFlow), frameworkVersion: `万象思维基座 · ${activeFlow?.name || "当前发布版"}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "模型分析失败" }, { status: 502 });
  }
}
