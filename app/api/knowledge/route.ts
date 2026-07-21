import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { knowledgeImports } from "@/db/schema";

function analyzeContent(content: string) {
  const pairs = [
    { keywords: ["证据", "事实", "数据", "来源"], target: "信息 × 准确性" },
    { keywords: ["假设", "前提", "条件"], target: "假设 × 深度" },
    { keywords: ["观点", "立场", "反方", "视角"], target: "观点 × 广度" },
    { keywords: ["概念", "定义", "边界"], target: "概念 × 精确性" },
    { keywords: ["目的", "目标", "意图"], target: "目的 × 重要性" },
  ];
  const hit = pairs.find((pair) => pair.keywords.some((word) => content.includes(word)));
  const target = hit?.target ?? "解释与推理 × 逻辑性";
  const covered = Boolean(hit);
  return {
    coverage: covered ? "covered" : "extension",
    target,
    recommendation: covered
      ? "作为现有方法的补充条目或例证加入，不必升级整个体系。"
      : "当前体系只能部分解释，建议暂存并发起一次融合讨论，再决定是否形成新版本。",
    essence: content.trim().slice(0, 90),
  };
}

export async function GET() {
  try {
    await ensureSchema();
    const imports = await getDb().select().from(knowledgeImports).orderBy(desc(knowledgeImports.createdAt));
    return Response.json({ imports });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取导入材料失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { content?: string; source?: string; note?: string };
    if (!payload.content?.trim() || !payload.source?.trim()) {
      return Response.json({ error: "内容和出处均不能为空" }, { status: 400 });
    }
    const analysis = analyzeContent(payload.content);
    const [item] = await getDb().insert(knowledgeImports).values({
      id: crypto.randomUUID(),
      content: payload.content.trim(),
      source: payload.source.trim(),
      note: payload.note?.trim() || "",
      analysisJson: JSON.stringify(analysis),
      disposition: "pending",
    }).returning();
    return Response.json({ item, analysis }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "分析导入材料失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { id?: string; disposition?: string };
    if (!payload.id || !payload.disposition) {
      return Response.json({ error: "缺少处理状态" }, { status: 400 });
    }
    const [item] = await getDb().update(knowledgeImports).set({
      disposition: payload.disposition,
      updatedAt: new Date().toISOString(),
    }).where(eq(knowledgeImports.id, payload.id)).returning();
    return Response.json({ item });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新材料状态失败" }, { status: 500 });
  }
}
