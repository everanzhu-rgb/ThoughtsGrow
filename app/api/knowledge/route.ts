import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { knowledgeImports } from "@/db/schema";
import { deepSeekJson, frameworkBrief } from "@/lib/deepseek";

type ImportAnalysis = {
  coverage: "covered" | "extension";
  target: string;
  recommendation: string;
  essence: string;
  overlaps: string[];
  novelty: string;
  integrationPlan: string[];
};

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
    const analysis = await deepSeekJson<ImportAnalysis>([
      {
        role: "system",
        content: `${frameworkBrief}\n你负责判断新材料与现有思维基座的关系。必须输出 JSON：coverage 只能是 covered 或 extension；target 是最适合的元素×标准或“新维度候选”；recommendation 给出补丁/暂存/升级版本建议；essence 用一句话概括；overlaps 列出与现有体系的重合点；novelty 写真正新增之处；integrationPlan 给出 2-4 个融合步骤。不得因为术语不同就误判为全新内容。`,
      },
      { role: "user", content: `出处：${payload.source}\n个人札记：${payload.note || "无"}\n材料：\n${payload.content}` },
    ]);
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
