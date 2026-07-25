import { deepSeekJson } from "@/lib/deepseek";

type Patch = { id: string; accepted: boolean; targetSpaceId: string; targetNodeId: string; action: "add" | "update" | "merge" | "link"; nodeType: string; title: string; currentContent: string; proposedContent: string; why: string; sourceEvidence: string; playbookStep: string };

function normalize(value: unknown) {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const list = (key: string) => Array.isArray(raw[key]) ? (raw[key] as unknown[]).map(String).slice(0, 8) : [];
  const patches = (Array.isArray(raw.patches) ? raw.patches : []).map((item, index): Patch => {
    const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const action = ["add", "update", "merge", "link"].includes(String(entry.action)) ? String(entry.action) as Patch["action"] : "add";
    return { id: crypto.randomUUID(), accepted: true, targetSpaceId: String(entry.targetSpaceId || "meta-core"), targetNodeId: String(entry.targetNodeId || ""), action, nodeType: String(entry.nodeType || "method"), title: String(entry.title || `待融合认知单元 ${index + 1}`), currentContent: String(entry.currentContent || ""), proposedContent: String(entry.proposedContent || ""), why: String(entry.why || "补充现有基座"), sourceEvidence: String(entry.sourceEvidence || ""), playbookStep: String(entry.playbookStep || "") };
  }).slice(0, 8);
  return { destination: String(raw.destination || "暂存"), synthesis: String(raw.synthesis || "尚未形成融合摘要"), why: String(raw.why || "需要用户判断最合适的归属"), extractions: list("extractions"), conflicts: list("conflicts"), impact: list("impact"), patches };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { record?: { title?: string; content?: string; source?: string; note?: string; reportContent?: string }; spaces?: unknown; nodes?: unknown };
    if (!payload.record?.content?.trim()) return Response.json({ error: "缺少待融合记录" }, { status: 400 });
    const result = await deepSeekJson<unknown>([
      { role: "system", content: `你是“个人认知体系编译器”。任务不是再次总结文本，而是判断一条记录怎样改变用户当前的思维基座。只能依据原文、分析报告与当前基座。输出 JSON：destination、synthesis、why、extractions、conflicts、impact、patches。destination 只能是“元认知基座”“领域基座”“两者”“暂存”。extractions 是从记录提炼出的不重复认知单元。patches 每项必须包含 targetSpaceId、targetNodeId、action、nodeType、title、currentContent、proposedContent、why、sourceEvidence、playbookStep。action 只能为 add/update/merge/link。优先修改已有节点，只有真正新增知识才 add；不能为了覆盖而机械产生补丁。若内容应进入分析流程，playbookStep 写清楚要加入的可操作问题、为什么问、完成标准。解释冲突与影响，不得自动替用户决定价值立场。` },
      { role: "user", content: `【思维记录】\n标题：${payload.record.title || "未命名"}\n出处：${payload.record.source || "未注明"}\n此刻札记：${payload.record.note || "无"}\n原文：\n${payload.record.content}\n\n【已有分析】\n${payload.record.reportContent || "尚无"}\n\n【当前基座空间】\n${JSON.stringify(payload.spaces || [])}\n\n【当前认知节点】\n${JSON.stringify(payload.nodes || [])}` },
    ]);
    return Response.json({ result: normalize(result) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "融合分析失败" }, { status: 502 }); }
}
