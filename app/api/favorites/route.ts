import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inspirationFavorites } from "@/db/schema";

export async function GET() {
  try {
    const favorites = await getDb().select().from(inspirationFavorites).orderBy(desc(inspirationFavorites.createdAt)).limit(100);
    return Response.json({ favorites });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取收藏失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { quote?: string; author?: string; language?: string; translation?: string; source?: string; sourceUrl?: string };
    if (!payload.quote?.trim()) return Response.json({ error: "句子不能为空" }, { status: 400 });
    const [favorite] = await getDb().insert(inspirationFavorites).values({
      id: crypto.randomUUID(),
      quote: payload.quote.trim(),
      author: payload.author?.trim() || "",
      language: payload.language || "zh",
      translation: payload.translation?.trim() || "",
      source: [payload.source?.trim(), payload.sourceUrl?.trim()].filter(Boolean).join(" · "),
    }).returning();
    return Response.json({ favorite }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "收藏失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as { id?: string };
    if (!payload.id) return Response.json({ error: "缺少收藏编号" }, { status: 400 });
    await getDb().delete(inspirationFavorites).where(eq(inspirationFavorites.id, payload.id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "取消收藏失败" }, { status: 500 });
  }
}
