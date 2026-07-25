import { asc, desc, eq, or } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { baseNodeLinks, baseNodes, baseSpaces, baseVersions, recordNodeLinks, thinkingRecords } from "@/db/schema";

async function snapshot(spaceId: string) {
  const db = getDb();
  const [space] = await db.select().from(baseSpaces).where(eq(baseSpaces.id, spaceId));
  const nodes = await db.select().from(baseNodes).where(eq(baseNodes.spaceId, spaceId)).orderBy(asc(baseNodes.sortOrder));
  const ids = new Set(nodes.map((node) => node.id));
  const allLinks = await db.select().from(baseNodeLinks);
  const links = allLinks.filter((link) => ids.has(link.fromNodeId) || ids.has(link.toNodeId));
  return { space, nodes, links };
}

export async function GET() {
  try {
    await ensureSchema();
    const db = getDb();
    const [spaces, nodes, nodeLinks, sourceLinks, versions, records] = await Promise.all([
      db.select().from(baseSpaces).orderBy(asc(baseSpaces.createdAt)),
      db.select().from(baseNodes).orderBy(asc(baseNodes.sortOrder)),
      db.select().from(baseNodeLinks),
      db.select().from(recordNodeLinks).orderBy(desc(recordNodeLinks.createdAt)),
      db.select().from(baseVersions).orderBy(desc(baseVersions.createdAt)),
      db.select({ id: thinkingRecords.id, title: thinkingRecords.title, source: thinkingRecords.source }).from(thinkingRecords),
    ]);
    return Response.json({ spaces, nodes, nodeLinks, recordLinks: sourceLinks, versions, records });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取思维基座失败" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as { action?: string; id?: string; spaceId?: string; name?: string; kind?: string; description?: string; scope?: string; parentId?: string | null; nodeType?: string; title?: string; content?: string; operational?: unknown; sortOrder?: number; fromNodeId?: string; toNodeId?: string; relation?: string; label?: string; summary?: string; sourceRecordIds?: string[]; versionId?: string };
    const db = getDb(); const now = new Date().toISOString();
    if (payload.action === "create_space") {
      const [space] = await db.insert(baseSpaces).values({ id: crypto.randomUUID(), name: payload.name?.trim() || "未命名领域", kind: payload.kind === "meta" ? "meta" : "domain", description: payload.description?.trim() || "", scope: payload.scope?.trim() || "" }).returning();
      return Response.json({ space }, { status: 201 });
    }
    if (payload.action === "update_space" && payload.id) {
      const [space] = await db.update(baseSpaces).set({ name: payload.name?.trim(), description: payload.description?.trim(), scope: payload.scope?.trim(), updatedAt: now }).where(eq(baseSpaces.id, payload.id)).returning();
      return Response.json({ space });
    }
    if (payload.action === "delete_space" && payload.id) {
      const nodes = await db.select({ id: baseNodes.id }).from(baseNodes).where(eq(baseNodes.spaceId, payload.id));
      for (const node of nodes) { await db.delete(recordNodeLinks).where(eq(recordNodeLinks.nodeId, node.id)); await db.delete(baseNodeLinks).where(or(eq(baseNodeLinks.fromNodeId, node.id), eq(baseNodeLinks.toNodeId, node.id))); }
      await db.delete(baseNodes).where(eq(baseNodes.spaceId, payload.id)); await db.delete(baseVersions).where(eq(baseVersions.spaceId, payload.id)); await db.delete(baseSpaces).where(eq(baseSpaces.id, payload.id));
      return Response.json({ ok: true });
    }
    if (payload.action === "create_node" && payload.spaceId) {
      const [node] = await db.insert(baseNodes).values({ id: crypto.randomUUID(), spaceId: payload.spaceId, parentId: payload.parentId || null, nodeType: payload.nodeType || "method", title: payload.title?.trim() || "未命名认知单元", content: payload.content?.trim() || "", operationalJson: JSON.stringify(payload.operational ?? {}), sortOrder: payload.sortOrder ?? Date.now() % 100000 }).returning();
      return Response.json({ node }, { status: 201 });
    }
    if (payload.action === "update_node" && payload.id) {
      const [node] = await db.update(baseNodes).set({ spaceId: payload.spaceId, parentId: payload.parentId || null, nodeType: payload.nodeType, title: payload.title?.trim(), content: payload.content?.trim(), ...(payload.operational !== undefined ? { operationalJson: JSON.stringify(payload.operational) } : {}), updatedAt: now }).where(eq(baseNodes.id, payload.id)).returning();
      return Response.json({ node });
    }
    if (payload.action === "delete_node" && payload.id) {
      await db.delete(recordNodeLinks).where(eq(recordNodeLinks.nodeId, payload.id)); await db.delete(baseNodeLinks).where(or(eq(baseNodeLinks.fromNodeId, payload.id), eq(baseNodeLinks.toNodeId, payload.id))); await db.delete(baseNodes).where(eq(baseNodes.id, payload.id));
      return Response.json({ ok: true });
    }
    if (payload.action === "create_link" && payload.fromNodeId && payload.toNodeId) {
      const [link] = await db.insert(baseNodeLinks).values({ id: crypto.randomUUID(), fromNodeId: payload.fromNodeId, toNodeId: payload.toNodeId, relation: payload.relation || "related", label: payload.label || "" }).returning(); return Response.json({ link }, { status: 201 });
    }
    if (payload.action === "delete_link" && payload.id) { await db.delete(baseNodeLinks).where(eq(baseNodeLinks.id, payload.id)); return Response.json({ ok: true }); }
    if (payload.action === "publish" && payload.spaceId) {
      const state = await snapshot(payload.spaceId); const existing = await db.select().from(baseVersions).where(eq(baseVersions.spaceId, payload.spaceId)); const versionNumber = Math.max(0, ...existing.map((item) => item.versionNumber)) + 1;
      const [version] = await db.insert(baseVersions).values({ id: crypto.randomUUID(), spaceId: payload.spaceId, versionNumber, title: payload.title?.trim() || `${state.space?.name || "思维基座"} · v${versionNumber}`, summary: payload.summary?.trim() || "手动发布基座更新", snapshotJson: JSON.stringify(state), sourceRecordIdsJson: JSON.stringify(payload.sourceRecordIds || []) }).returning();
      return Response.json({ version }, { status: 201 });
    }
    if (payload.action === "restore_version" && payload.versionId) {
      const [version] = await db.select().from(baseVersions).where(eq(baseVersions.id, payload.versionId)); if (!version) return Response.json({ error: "版本不存在" }, { status: 404 });
      const state = JSON.parse(version.snapshotJson || "{}") as { space?: typeof baseSpaces.$inferSelect; nodes?: Array<typeof baseNodes.$inferSelect>; links?: Array<typeof baseNodeLinks.$inferSelect> };
      const currentNodes = await db.select({ id: baseNodes.id }).from(baseNodes).where(eq(baseNodes.spaceId, version.spaceId));
      for (const node of currentNodes) { await db.delete(baseNodeLinks).where(or(eq(baseNodeLinks.fromNodeId, node.id), eq(baseNodeLinks.toNodeId, node.id))); if (!(state.nodes || []).some((saved) => saved.id === node.id)) await db.delete(recordNodeLinks).where(eq(recordNodeLinks.nodeId, node.id)); }
      await db.delete(baseNodes).where(eq(baseNodes.spaceId, version.spaceId));
      for (const node of state.nodes || []) await db.insert(baseNodes).values({ ...node, updatedAt: now }).onConflictDoNothing();
      for (const link of state.links || []) await db.insert(baseNodeLinks).values(link).onConflictDoNothing();
      const restored = await snapshot(version.spaceId); const existing = await db.select().from(baseVersions).where(eq(baseVersions.spaceId, version.spaceId)); const next = Math.max(0, ...existing.map((item) => item.versionNumber)) + 1;
      const [created] = await db.insert(baseVersions).values({ id: crypto.randomUUID(), spaceId: version.spaceId, versionNumber: next, title: `恢复自 v${version.versionNumber}`, summary: `以 v${version.versionNumber} 为基础创建的新版本，历史未被覆盖。`, snapshotJson: JSON.stringify(restored), sourceRecordIdsJson: version.sourceRecordIdsJson }).returning();
      return Response.json({ version: created });
    }
    return Response.json({ error: "未知基座操作" }, { status: 400 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "基座操作失败" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try { await ensureSchema(); const payload = (await request.json()) as { versionId?: string }; if (!payload.versionId) return Response.json({ error: "缺少版本编号" }, { status: 400 }); await getDb().delete(baseVersions).where(eq(baseVersions.id, payload.versionId)); return Response.json({ ok: true }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "删除版本失败" }, { status: 500 }); }
}
