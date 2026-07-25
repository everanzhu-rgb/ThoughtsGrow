import { eq, or } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { recordRelations, thinkingRecords } from "@/db/schema";

async function enriched(recordId?: string) {
  const db = getDb();
  const relations = recordId
    ? await db.select().from(recordRelations).where(or(eq(recordRelations.fromRecordId, recordId), eq(recordRelations.toRecordId, recordId)))
    : await db.select().from(recordRelations);
  const records = await db.select({ id: thinkingRecords.id, title: thinkingRecords.title, summary: thinkingRecords.summary, source: thinkingRecords.source }).from(thinkingRecords);
  return relations.map((relation) => ({ ...relation, fromRecord: records.find((record) => record.id === relation.fromRecordId), toRecord: records.find((record) => record.id === relation.toRecordId) }));
}

export async function GET(request: Request) {
  try { await ensureSchema(); const recordId = new URL(request.url).searchParams.get("recordId") || undefined; return Response.json({ relations: await enriched(recordId) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取记录关系失败" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { fromRecordId?: string; toRecordId?: string; relation?: string; reason?: string };
    if (!payload.fromRecordId || !payload.toRecordId || payload.fromRecordId === payload.toRecordId) return Response.json({ error: "需要两条不同的记录" }, { status: 400 });
    const [fromRecordId, toRecordId] = [payload.fromRecordId, payload.toRecordId].sort();
    const db = getDb(); const candidates = await db.select().from(recordRelations).where(eq(recordRelations.fromRecordId, fromRecordId));
    const existing = candidates.find((item) => item.toRecordId === toRecordId);
    if (existing) return Response.json({ relation: existing, relations: await enriched() });
    const [relation] = await db.insert(recordRelations).values({ id: crypto.randomUUID(), fromRecordId, toRecordId, relation: ["related", "merge", "duplicate", "tension"].includes(payload.relation || "") ? payload.relation! : "related", reason: payload.reason?.trim() || "由关系图谱确认" }).returning();
    return Response.json({ relation, relations: await enriched() }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "确认关系失败" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try { await ensureSchema(); const payload = (await request.json()) as { id?: string }; if (!payload.id) return Response.json({ error: "缺少关系编号" }, { status: 400 }); await getDb().delete(recordRelations).where(eq(recordRelations.id, payload.id)); return Response.json({ ok: true }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "删除关系失败" }, { status: 500 }); }
}
