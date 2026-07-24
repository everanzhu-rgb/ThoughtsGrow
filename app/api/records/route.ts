import { and, desc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { analysisVersions, conversationTurns, thinkingRecords, trainingSessions } from "@/db/schema";

async function purgeExpired() {
  const db = getDb();
  const expired = await db.select({ id: thinkingRecords.id }).from(thinkingRecords).where(and(isNotNull(thinkingRecords.deleteAfter), lt(thinkingRecords.deleteAfter, new Date().toISOString())));
  for (const record of expired) {
    await Promise.all([
      db.delete(analysisVersions).where(eq(analysisVersions.recordId, record.id)),
      db.delete(conversationTurns).where(eq(conversationTurns.recordId, record.id)),
      db.delete(trainingSessions).where(eq(trainingSessions.recordId, record.id)),
    ]);
    await db.delete(thinkingRecords).where(eq(thinkingRecords.id, record.id));
  }
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    await purgeExpired();
    const trash = new URL(request.url).searchParams.get("trash") === "1";
    const records = await getDb()
      .select()
      .from(thinkingRecords)
      .where(trash ? isNotNull(thinkingRecords.deletedAt) : isNull(thinkingRecords.deletedAt))
      .orderBy(desc(thinkingRecords.createdAt))
      .limit(100);
    return Response.json({ records });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "读取记录失败" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { id?: string; title?: string; content?: string; scene?: string; source?: string; sourceUrl?: string; note?: string; tags?: string[]; importance?: number; annotations?: unknown[]; reportContent?: string; action?: "restore" | "review"; reviewGrade?: "again" | "hard" | "good" | "easy" };
    if (!payload.id) return Response.json({ error: "缺少记录编号" }, { status: 400 });
    const reviewIntervals = { again: 1, hard: 3, good: 7, easy: 21 };
    const reviewDays = reviewIntervals[payload.reviewGrade || "good"];
    const values = payload.action === "restore"
      ? { deletedAt: null, deleteAfter: null, updatedAt: new Date().toISOString() }
      : payload.action === "review"
        ? { nextReviewAt: new Date(Date.now() + reviewDays * 86400000).toISOString(), reviewCount: sql`${thinkingRecords.reviewCount} + 1`, updatedAt: new Date().toISOString() }
        : { title: payload.title?.trim(), content: payload.content?.trim(), scene: payload.scene?.trim(), source: payload.source?.trim(), sourceUrl: payload.sourceUrl?.trim(), note: payload.note?.trim(), ...(payload.tags ? { tagsJson: JSON.stringify(payload.tags.slice(0, 20)) } : {}), ...(payload.importance ? { importance: Math.max(1, Math.min(5, payload.importance)) } : {}), ...(payload.annotations ? { annotationsJson: JSON.stringify(payload.annotations) } : {}), ...(payload.reportContent !== undefined ? { reportContent: payload.reportContent } : {}), updatedAt: new Date().toISOString() };
    const [record] = await getDb().update(thinkingRecords).set(values).where(eq(thinkingRecords.id, payload.id)).returning();
    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新记录失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { id?: string; permanent?: boolean };
    if (!payload.id) return Response.json({ error: "缺少记录编号" }, { status: 400 });
    if (payload.permanent) {
      const db = getDb();
      await Promise.all([
        db.delete(analysisVersions).where(eq(analysisVersions.recordId, payload.id)),
        db.delete(conversationTurns).where(eq(conversationTurns.recordId, payload.id)),
        db.delete(trainingSessions).where(eq(trainingSessions.recordId, payload.id)),
      ]);
      await db.delete(thinkingRecords).where(eq(thinkingRecords.id, payload.id));
    } else {
      const now = new Date();
      const deleteAfter = new Date(now.getTime() + 30 * 86400000).toISOString();
      await getDb().update(thinkingRecords).set({ deletedAt: now.toISOString(), deleteAfter, updatedAt: now.toISOString() }).where(eq(thinkingRecords.id, payload.id));
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as {
      title?: string;
      content?: string;
      scene?: string;
      mode?: string;
      source?: string;
      sourceUrl?: string;
      note?: string;
      tags?: string[];
      importance?: number;
    };
    const content = payload.content?.trim() ?? "";
    if (content.length < 10) {
      return Response.json(
        { error: "请至少写下 10 个字，帮助系统理解这次思考。" },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const title =
      payload.title?.trim() ||
      `${payload.scene || "思维"}记录 · ${new Date().toLocaleDateString("zh-CN")}`;
    const [record] = await getDb()
      .insert(thinkingRecords)
      .values({
        id,
        title,
        content,
        scene: payload.scene || "日常思考",
        mode: payload.mode || "record",
        status: "saved",
        source: payload.source?.trim() || "",
        sourceUrl: payload.sourceUrl?.trim() || "",
        note: payload.note?.trim() || "",
        tagsJson: JSON.stringify((payload.tags || []).slice(0, 20)),
        importance: Math.max(1, Math.min(5, payload.importance || 3)),
        nextReviewAt: new Date(Date.now() + 86400000).toISOString(),
      })
      .returning();

    return Response.json({ record }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 },
    );
  }
}
