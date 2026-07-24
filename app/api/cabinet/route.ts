import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { cabinetItems, inspirationFavorites } from "@/db/schema";

export async function GET() {
  try { await ensureSchema(); const [items, quotes] = await Promise.all([getDb().select().from(cabinetItems).orderBy(desc(cabinetItems.createdAt)), getDb().select().from(inspirationFavorites).orderBy(desc(inspirationFavorites.createdAt))]); return Response.json({ items: [...items, ...quotes.map((quote) => ({ id: `favorite-${quote.id}`, kind: "quote", title: quote.author, content: quote.quote, source: quote.source, imageUrl: "", note: quote.translation, createdAt: quote.createdAt, favoriteId: quote.id }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取收藏橱失败" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try { await ensureSchema(); const payload = (await request.json()) as { kind?: string; title?: string; content?: string; source?: string; imageUrl?: string; note?: string }; if (!payload.content?.trim() && !payload.imageUrl?.trim()) return Response.json({ error: "请写下内容或选择图片" }, { status: 400 }); const [item] = await getDb().insert(cabinetItems).values({ id: crypto.randomUUID(), kind: payload.kind || "quote", title: payload.title?.trim() || "", content: payload.content?.trim() || "", source: payload.source?.trim() || "", imageUrl: payload.imageUrl?.trim() || "", note: payload.note?.trim() || "" }).returning(); return Response.json({ item }, { status: 201 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "收藏失败" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try { await ensureSchema(); const payload = (await request.json()) as { id?: string; favoriteId?: string }; if (payload.favoriteId) await getDb().delete(inspirationFavorites).where(eq(inspirationFavorites.id, payload.favoriteId)); else if (payload.id) await getDb().delete(cabinetItems).where(eq(cabinetItems.id, payload.id)); else return Response.json({ error: "缺少收藏编号" }, { status: 400 }); return Response.json({ ok: true }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "移除失败" }, { status: 500 }); }
}
