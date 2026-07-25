import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { trainingReports } from "@/db/schema";

export async function GET() {
  try {
    await ensureSchema();
    const reports = await getDb().select().from(trainingReports).orderBy(desc(trainingReports.createdAt)).limit(60);
    return Response.json({ reports });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取训练报告失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { title?: string; source?: string; sourceUrl?: string; domain?: string; articleExcerpt?: string; reportContent?: string; analysis?: unknown };
    if (!payload.title?.trim() || !payload.reportContent?.trim()) return Response.json({ error: "训练报告内容不完整" }, { status: 400 });
    const [report] = await getDb().insert(trainingReports).values({
      id: crypto.randomUUID(),
      title: payload.title.trim(),
      source: payload.source?.trim() || "",
      sourceUrl: payload.sourceUrl?.trim() || "",
      domain: payload.domain?.trim() || "",
      articleExcerpt: payload.articleExcerpt?.trim() || "",
      reportContent: payload.reportContent,
      analysisJson: JSON.stringify(payload.analysis ?? {}),
    }).returning();
    return Response.json({ report }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存训练报告失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSchema();
    const { id } = (await request.json()) as { id?: string };
    if (!id) return Response.json({ error: "缺少报告编号" }, { status: 400 });
    await getDb().delete(trainingReports).where(eq(trainingReports.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除训练报告失败" }, { status: 500 });
  }
}
