import { deepSeekJson, frameworkBrief } from "@/lib/deepseek";

type AnalysisResult = {
  overview: string;
  strengths: string[];
  gaps: string[];
  nextStep: string;
  focusTitle: string;
  focusFinding: string;
  evidence: string;
  questions: string[];
  structure: Array<{ name: string; text: string }>;
  assessments: Array<{ element: string; standard: string; finding: string; evidence: string; confidence: "高" | "中" | "低" | "暂不评价" }>;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { text?: string; focus?: string; scene?: string };
    const text = payload.text?.trim();
    if (!text || text.length < 10) return Response.json({ error: "请至少输入 10 个字。" }, { status: 400 });
    const focus = payload.focus?.trim() || "整体分析";
    const result = await deepSeekJson<AnalysisResult>([
      {
        role: "system",
        content: `${frameworkBrief}\n你是严谨的中文思维分析师。只能依据用户原文，不进行人格判断。必须输出 JSON，字段为 overview、strengths、gaps、nextStep、focusTitle、focusFinding、evidence、questions、structure、assessments。strengths/gaps/questions 各 2-4 条；structure 使用八个思维元素，缺失内容明确写“原文未提供”；assessments 只保留有证据的 3-6 个组合。`,
      },
      { role: "user", content: `场景：${payload.scene || "未指定"}\n重点专题：${focus}\n待分析文本：\n${text}` },
    ]);
    return Response.json({ result, frameworkVersion: "Critical Thinking Base V1.0" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "模型分析失败" }, { status: 502 });
  }
}

