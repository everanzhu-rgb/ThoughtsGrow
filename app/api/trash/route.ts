import { desc, eq, isNotNull } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { analysisVersions, conversationTurns, knowledgeImports, thinkingRecords, trainingSessions } from "@/db/schema";

export async function GET() {
  try {
    await ensureSchema();
    const db = getDb();
    const [records, imports] = await Promise.all([
      db.select().from(thinkingRecords).where(isNotNull(thinkingRecords.deletedAt)).orderBy(desc(thinkingRecords.deletedAt)),
      db.select().from(knowledgeImports).where(isNotNull(knowledgeImports.deletedAt)).orderBy(desc(knowledgeImports.deletedAt)),
    ]);
    return Response.json({ records, imports });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取回收站失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { type?: "record" | "import"; id?: string };
    if (!payload.id || !payload.type) return Response.json({ error: "缺少恢复对象" }, { status: 400 });
    if (payload.type === "record") await getDb().update(thinkingRecords).set({ deletedAt: null, deleteAfter: null, updatedAt: new Date().toISOString() }).where(eq(thinkingRecords.id, payload.id));
    else await getDb().update(knowledgeImports).set({ deletedAt: null, deleteAfter: null, updatedAt: new Date().toISOString() }).where(eq(knowledgeImports.id, payload.id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "恢复失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { type?: "record" | "import"; id?: string };
    if (!payload.id || !payload.type) return Response.json({ error: "缺少删除对象" }, { status: 400 });
    const db = getDb();
    if (payload.type === "record") {
      await Promise.all([
        db.delete(analysisVersions).where(eq(analysisVersions.recordId, payload.id)),
        db.delete(conversationTurns).where(eq(conversationTurns.recordId, payload.id)),
        db.delete(trainingSessions).where(eq(trainingSessions.recordId, payload.id)),
      ]);
      await db.delete(thinkingRecords).where(eq(thinkingRecords.id, payload.id));
    } else await db.delete(knowledgeImports).where(eq(knowledgeImports.id, payload.id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "彻底删除失败" }, { status: 500 });
  }
}
