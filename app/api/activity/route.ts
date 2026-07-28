import { and, desc, gte, isNull } from "drizzle-orm";
import { getDb, getD1 } from "@/db";
import { activityEvents, knowledgeImports, thinkingRecords, trainingSessions, usageDaily } from "@/db/schema";

type DayItem = { kind: string; summary: string; at: string };

let usageSchemaPromise: Promise<unknown> | null = null;
function ensureUsageSchema() {
  usageSchemaPromise ||= getD1().prepare("CREATE TABLE IF NOT EXISTS usage_daily (day TEXT PRIMARY KEY, duration_seconds INTEGER NOT NULL DEFAULT 0, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  return usageSchemaPromise;
}

function dateKey(value: string) {
  const parsed = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : new Date(parsed.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    await ensureUsageSchema();
    const requested = Number(new URL(request.url).searchParams.get("days") || 60);
    const days = Math.max(3, Math.min(60, requested));
    const since = new Date(Date.now() - (days - 1) * 86400000).toISOString();
    const db = getDb();
    const [events, records, imports, sessions, usage] = await Promise.all([
      db.select().from(activityEvents).where(gte(activityEvents.occurredAt, since)).orderBy(desc(activityEvents.occurredAt)),
      db.select().from(thinkingRecords).where(and(gte(thinkingRecords.createdAt, since), isNull(thinkingRecords.deletedAt))).orderBy(desc(thinkingRecords.createdAt)),
      db.select().from(knowledgeImports).where(and(gte(knowledgeImports.createdAt, since), isNull(knowledgeImports.deletedAt))).orderBy(desc(knowledgeImports.createdAt)),
      db.select().from(trainingSessions).where(gte(trainingSessions.createdAt, since)).orderBy(desc(trainingSessions.createdAt)),
      db.select().from(usageDaily).where(gte(usageDaily.day, since.slice(0, 10))).orderBy(desc(usageDaily.day)),
    ]);
    const byDay: Record<string, DayItem[]> = {};
    const add = (at: string, item: DayItem) => { (byDay[dateKey(at)] ||= []).push(item); };
    events.filter((item) => item.kind !== "visit").forEach((item) => add(item.occurredAt, { kind: item.kind, summary: item.summary || "完成了一次站内活动", at: item.occurredAt }));
    records.forEach((item) => add(item.createdAt, { kind: "记录", summary: `写下《${item.title || "未命名记录"}》`, at: item.createdAt }));
    imports.forEach((item) => add(item.createdAt, { kind: "阅读", summary: `带回一则材料：${item.source || "未注明出处"}`, at: item.createdAt }));
    sessions.forEach((item) => add(item.createdAt, { kind: "训练", summary: `练习了 ${item.focusElement} × ${item.focusStandard}`, at: item.createdAt }));
    const summarized = Object.fromEntries(Object.entries(byDay).map(([day, items]) => {
      const groups = new Map<string, DayItem[]>();
      items.forEach((item) => groups.set(item.kind, [...(groups.get(item.kind) || []), item]));
      const summary = [...groups.entries()].slice(0, 4).map(([kind, grouped]) => ({
        kind,
        summary: grouped.length === 1 ? grouped[0].summary : `${grouped[0].summary}，另有 ${grouped.length - 1} 项同类活动`,
        at: grouped[0].at,
      }));
      return [day, summary];
    }));
    const usageByDay = Object.fromEntries(usage.map((item) => [item.day, item.durationSeconds]));
    const totalUsageSeconds = usage.reduce((sum, item) => sum + item.durationSeconds, 0);
    return Response.json({ days, byDay: summarized, usageByDay, totalUsageSeconds });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取活跃轨迹失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
