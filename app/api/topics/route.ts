import { desc, eq, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { trainingTopics } from "@/db/schema";

export async function GET() {
  try {
    await ensureSchema();
    const topics = await getDb().select().from(trainingTopics).orderBy(desc(trainingTopics.createdAt));
    return Response.json({ topics });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取专题失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { name?: string; focusElement?: string; focusStandard?: string; description?: string };
    if (!payload.name?.trim()) return Response.json({ error: "专题名称不能为空" }, { status: 400 });
    const [topic] = await getDb().insert(trainingTopics).values({
      id: crypto.randomUUID(),
      name: payload.name.trim(),
      description: payload.description?.trim() || "从真实记录中持续积累案例与训练。",
      focusElement: payload.focusElement?.trim() || "观点",
      focusStandard: payload.focusStandard?.trim() || "广度",
      status: "active",
      sessionCount: 0,
    }).returning();
    return Response.json({ topic }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "创建专题失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { id?: string; action?: string };
    if (!payload.id || payload.action !== "complete_session") return Response.json({ error: "缺少专题操作" }, { status: 400 });
    const [topic] = await getDb().update(trainingTopics).set({ sessionCount: sql`${trainingTopics.sessionCount} + 1` }).where(eq(trainingTopics.id, payload.id)).returning();
    return Response.json({ topic });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新专题失败" }, { status: 500 });
  }
}
