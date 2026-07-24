import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { frameworkNodePositions } from "@/db/schema";

export async function GET() {
  try { await ensureSchema(); return Response.json({ positions: await getDb().select().from(frameworkNodePositions) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取布局失败" }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { positions?: Array<{ nodeId: string; x: number; y: number }> };
    const positions = (payload.positions || []).filter((item) => item.nodeId && Number.isFinite(item.x) && Number.isFinite(item.y)).slice(0, 100);
    const db = getDb();
    for (const item of positions) await db.insert(frameworkNodePositions).values({ ...item, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: frameworkNodePositions.nodeId, set: { x: item.x, y: item.y, updatedAt: new Date().toISOString() } });
    return Response.json({ ok: true, count: positions.length });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "保存布局失败" }, { status: 500 }); }
}

export async function DELETE() {
  try { await ensureSchema(); const rows = await getDb().select({ nodeId: frameworkNodePositions.nodeId }).from(frameworkNodePositions); for (const row of rows) await getDb().delete(frameworkNodePositions).where(eq(frameworkNodePositions.nodeId, row.nodeId)); return Response.json({ ok: true }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "重置布局失败" }, { status: 500 }); }
}
