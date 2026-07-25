import { asc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { recordFolderLinks, recordFolders } from "@/db/schema";

export async function GET() {
  try {
    await ensureSchema();
    const db = getDb();
    const [folders, links] = await Promise.all([
      db.select().from(recordFolders).orderBy(asc(recordFolders.sortOrder)),
      db.select().from(recordFolderLinks).orderBy(asc(recordFolderLinks.createdAt)),
    ]);
    return Response.json({ folders, links });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取记录文件夹失败" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = await request.json() as { action?: string; id?: string; name?: string; parentId?: string | null; folderId?: string; recordId?: string };
    const db = getDb();
    if (payload.action === "create" && payload.name?.trim()) {
      const [folder] = await db.insert(recordFolders).values({ id: crypto.randomUUID(), name: payload.name.trim(), parentId: payload.parentId || null, sortOrder: Date.now() % 100000 }).returning();
      return Response.json({ folder }, { status: 201 });
    }
    if (payload.action === "rename" && payload.id && payload.name?.trim()) {
      const [folder] = await db.update(recordFolders).set({ name: payload.name.trim(), updatedAt: new Date().toISOString() }).where(eq(recordFolders.id, payload.id)).returning();
      return Response.json({ folder });
    }
    if (payload.action === "delete" && payload.id) {
      await db.delete(recordFolderLinks).where(eq(recordFolderLinks.folderId, payload.id));
      await db.delete(recordFolders).where(eq(recordFolders.id, payload.id));
      return Response.json({ ok: true });
    }
    if (payload.action === "move" && payload.recordId) {
      await db.delete(recordFolderLinks).where(eq(recordFolderLinks.recordId, payload.recordId));
      if (!payload.folderId) return Response.json({ ok: true });
      const [link] = await db.insert(recordFolderLinks).values({ id: crypto.randomUUID(), folderId: payload.folderId, recordId: payload.recordId }).returning();
      return Response.json({ link });
    }
    return Response.json({ error: "未知文件夹操作" }, { status: 400 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "文件夹操作失败" }, { status: 500 }); }
}
