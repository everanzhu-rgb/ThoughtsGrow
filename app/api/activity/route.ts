import { and, desc, gte, isNull } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { activityEvents, knowledgeImports, thinkingRecords, trainingSessions } from "@/db/schema";

type DayItem = { kind: string; summary: string; at: string };

function dateKey(value: string) {
  const parsed = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const requested = Number(new URL(request.url).searchParams.get("days") || 60);
    const days = Math.max(3, Math.min(60, requested));
    const since = new Date(Date.now() - (days - 1) * 86400000).toISOString();
    const db = getDb();
    const [events, records, imports, sessions] = await Promise.all([
      db.select().from(activityEvents).where(gte(activityEvents.occurredAt, since)).orderBy(desc(activityEvents.occurredAt)),
      db.select().from(thinkingRecords).where(and(gte(thinkingRecords.createdAt, since), isNull(thinkingRecords.deletedAt))).orderBy(desc(thinkingRecords.createdAt)),
      db.select().from(knowledgeImports).where(and(gte(knowledgeImports.createdAt, since), isNull(knowledgeImports.deletedAt))).orderBy(desc(knowledgeImports.createdAt)),
      db.select().from(trainingSessions).where(gte(trainingSessions.createdAt, since)).orderBy(desc(trainingSessions.createdAt)),
    ]);
    const byDay: Record<string, DayItem[]> = {};
    const add = (at: string, item: DayItem) => { (byDay[dateKey(at)] ||= []).push(item); };
    events.forEach((item) => add(item.occurredAt, { kind: item.kind, summary: item.summary || "打开了序理", at: item.occurredAt }));
    records.forEach((item) => add(item.createdAt, { kind: "record", summary: `记录：${item.title}`, at: item.createdAt }));
    imports.forEach((item) => add(item.createdAt, { kind: "import", summary: `导入：${item.source}`, at: item.createdAt }));
    sessions.forEach((item) => add(item.createdAt, { kind: "training", summary: `训练：${item.focusElement} × ${item.focusStandard}`, at: item.createdAt }));
    return Response.json({ days, byDay });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取活跃轨迹失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json().catch(() => ({}))) as { kind?: string; summary?: string };
    const [event] = await getDb().insert(activityEvents).values({
      id: crypto.randomUUID(),
      kind: payload.kind || "visit",
      summary: payload.summary?.slice(0, 160) || "打开了序理",
    }).returning();
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "记录活跃状态失败" }, { status: 500 });
  }
}
