import { getD1 } from "@/db";

let schemaPromise: Promise<unknown> | null = null;

function ensureCommentsSchema() {
  schemaPromise ||= getD1().batch([
    getD1().prepare(`CREATE TABLE IF NOT EXISTS cabinet_comments (
      id TEXT PRIMARY KEY,
      cabinet_item_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    getD1().prepare("CREATE INDEX IF NOT EXISTS cabinet_comments_item_idx ON cabinet_comments(cabinet_item_id)"),
  ]);
  return schemaPromise;
}

export async function GET(request: Request) {
  try {
    await ensureCommentsSchema();
    const itemId = new URL(request.url).searchParams.get("itemId") || "";
    if (!itemId) return Response.json({ error: "缺少收藏编号" }, { status: 400 });
    const result = await getD1().prepare("SELECT id, cabinet_item_id AS cabinetItemId, content, created_at AS createdAt FROM cabinet_comments WHERE cabinet_item_id = ? ORDER BY created_at DESC").bind(itemId).all();
    return Response.json({ comments: result.results || [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取留言失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureCommentsSchema();
    const payload = (await request.json()) as { itemId?: string; content?: string };
    const content = payload.content?.trim() || "";
    if (!payload.itemId || !content) return Response.json({ error: "请写下留言或感悟" }, { status: 400 });
    if (content.length > 2000) return Response.json({ error: "单条留言请控制在 2000 字以内" }, { status: 400 });
    const id = crypto.randomUUID();
    await getD1().prepare("INSERT INTO cabinet_comments (id, cabinet_item_id, content) VALUES (?, ?, ?)").bind(id, payload.itemId, content).run();
    const row = await getD1().prepare("SELECT id, cabinet_item_id AS cabinetItemId, content, created_at AS createdAt FROM cabinet_comments WHERE id = ?").bind(id).first();
    return Response.json({ comment: row }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存留言失败" }, { status: 500 });
  }
}
