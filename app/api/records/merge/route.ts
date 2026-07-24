import { inArray } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { thinkingRecords } from "@/db/schema";

function list(value: string) { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; } }

export async function POST(request: Request) {
  try {
    await ensureSchema(); const payload = (await request.json()) as { ids?: string[]; title?: string };
    const ids = [...new Set(payload.ids || [])].slice(0, 12); if (ids.length < 2) return Response.json({ error: "请至少选择两条记录" }, { status: 400 });
    const rows = await getDb().select().from(thinkingRecords).where(inArray(thinkingRecords.id, ids)); if (rows.length < 2) return Response.json({ error: "记录不存在或不可合并" }, { status: 404 });
    const tags = [...new Set(rows.flatMap((row) => list(row.tagsJson)))]; const now = new Date().toISOString();
    const [record] = await getDb().insert(thinkingRecords).values({
      id: crypto.randomUUID(), title: payload.title?.trim() || `合并档案 · ${new Date().toLocaleDateString("zh-CN")}`,
      content: rows.map((row) => `## ${row.title}\n\n${row.content}`).join("\n\n---\n\n"), scene: "综合整理", mode: "record", status: "saved",
      source: rows.map((row) => row.source).filter(Boolean).join("；"), sourceUrl: rows.map((row) => row.sourceUrl).find(Boolean) || "",
      note: `由 ${rows.length} 条记录合并生成，原记录仍保留。`, tagsJson: JSON.stringify(tags), importance: Math.max(...rows.map((row) => row.importance)),
      mergedFromJson: JSON.stringify(rows.map((row) => ({ id: row.id, title: row.title }))), nextReviewAt: new Date(Date.now() + 86400000).toISOString(), createdAt: now, updatedAt: now,
    }).returning();
    return Response.json({ record }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "合并失败" }, { status: 500 }); }
}
