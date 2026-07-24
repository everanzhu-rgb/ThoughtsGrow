import { desc } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { frameworkNodeNotes } from "@/db/schema";

export async function GET() {
  try {
    await ensureSchema();
    const notes = await getDb().select().from(frameworkNodeNotes).orderBy(desc(frameworkNodeNotes.updatedAt));
    return Response.json({ notes });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取图谱札记失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { nodeId?: string; title?: string; content?: string };
    if (!payload.nodeId || !payload.content?.trim()) return Response.json({ error: "请选择节点并写下想法" }, { status: 400 });
    const [note] = await getDb().insert(frameworkNodeNotes).values({
      id: crypto.randomUUID(),
      nodeId: payload.nodeId,
      title: payload.title?.trim() || payload.nodeId,
      content: payload.content.trim(),
      updatedAt: new Date().toISOString(),
    }).returning();
    return Response.json({ note }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存图谱札记失败" }, { status: 500 });
  }
}
