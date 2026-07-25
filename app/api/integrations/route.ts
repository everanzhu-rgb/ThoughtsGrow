import { asc, desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { baseNodeLinks, baseNodes, baseSpaces, baseVersions, integrationProposals, recordNodeLinks, thinkingRecords } from "@/db/schema";

type PatchItem = { accepted?: boolean; targetSpaceId?: string; targetNodeId?: string; action?: string; nodeType?: string; title?: string; currentContent?: string; proposedContent?: string; why?: string; sourceEvidence?: string; playbookStep?: string };

async function publishSpace(spaceId: string, recordId: string, summary: string) {
  const db = getDb(); const [space] = await db.select().from(baseSpaces).where(eq(baseSpaces.id, spaceId)); const nodes = await db.select().from(baseNodes).where(eq(baseNodes.spaceId, spaceId)).orderBy(asc(baseNodes.sortOrder)); const ids = new Set(nodes.map((node) => node.id)); const links = (await db.select().from(baseNodeLinks)).filter((link) => ids.has(link.fromNodeId) || ids.has(link.toNodeId)); const versions = await db.select().from(baseVersions).where(eq(baseVersions.spaceId, spaceId)); const number = Math.max(0, ...versions.map((item) => item.versionNumber)) + 1;
  await db.insert(baseVersions).values({ id: crypto.randomUUID(), spaceId, versionNumber: number, title: `${space?.name || "思维基座"} · 融合更新 v${number}`, summary, snapshotJson: JSON.stringify({ space, nodes, links }), sourceRecordIdsJson: JSON.stringify([recordId]) });
}

export async function GET(request: Request) {
  try { await ensureSchema(); const recordId = new URL(request.url).searchParams.get("recordId"); const proposals = recordId ? await getDb().select().from(integrationProposals).where(eq(integrationProposals.recordId, recordId)).orderBy(desc(integrationProposals.createdAt)) : await getDb().select().from(integrationProposals).orderBy(desc(integrationProposals.createdAt)); return Response.json({ proposals }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取融合方案失败" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    await ensureSchema(); const payload = (await request.json()) as { action?: "save" | "apply"; id?: string; recordId?: string; proposal?: { synthesis?: string; patches?: PatchItem[] } }; if (!payload.recordId || !payload.proposal) return Response.json({ error: "融合方案不完整" }, { status: 400 }); const db = getDb(); const now = new Date().toISOString();
    if (payload.action === "save") { const [saved] = await db.insert(integrationProposals).values({ id: crypto.randomUUID(), recordId: payload.recordId, proposalJson: JSON.stringify(payload.proposal) }).returning(); return Response.json({ proposal: saved }, { status: 201 }); }
    if (payload.action === "apply") {
      const affected = new Set<string>(); const createdNodes: string[] = [];
      for (const patch of payload.proposal.patches || []) {
        if (patch.accepted === false || !patch.targetSpaceId) continue; affected.add(patch.targetSpaceId); let nodeId = patch.targetNodeId || "";
        if ((patch.action === "update" || patch.action === "merge") && nodeId) {
          await db.update(baseNodes).set({ title: patch.title?.trim(), content: patch.proposedContent?.trim() || patch.currentContent || "", updatedAt: now }).where(eq(baseNodes.id, nodeId));
        } else {
          nodeId = crypto.randomUUID(); const operational = patch.playbookStep ? { steps: [{ title: patch.title || "新增步骤", question: patch.playbookStep, why: patch.why || "来自融合记录", done: "能够给出有证据的回答" }] } : {};
          await db.insert(baseNodes).values({ id: nodeId, spaceId: patch.targetSpaceId, nodeType: patch.nodeType || (patch.playbookStep ? "playbook" : "method"), title: patch.title?.trim() || "新认知单元", content: patch.proposedContent?.trim() || "", operationalJson: JSON.stringify(operational), sortOrder: Date.now() % 100000 }); createdNodes.push(nodeId);
        }
        await db.insert(recordNodeLinks).values({ id: crypto.randomUUID(), recordId: payload.recordId, nodeId, relation: patch.action === "link" ? "example" : "source", note: `${patch.why || "由融合工作台建立"}${patch.sourceEvidence ? `；依据：${patch.sourceEvidence}` : ""}` });
      }
      for (const spaceId of affected) await publishSpace(spaceId, payload.recordId, payload.proposal.synthesis || "由思维记录融合更新");
      await db.update(thinkingRecords).set({ status: "integrated", updatedAt: now }).where(eq(thinkingRecords.id, payload.recordId));
      if (payload.id) await db.update(integrationProposals).set({ status: "applied", proposalJson: JSON.stringify(payload.proposal), updatedAt: now }).where(eq(integrationProposals.id, payload.id)); else await db.insert(integrationProposals).values({ id: crypto.randomUUID(), recordId: payload.recordId, status: "applied", proposalJson: JSON.stringify(payload.proposal) });
      return Response.json({ ok: true, affectedSpaces: [...affected], createdNodes });
    }
    return Response.json({ error: "未知融合操作" }, { status: 400 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "应用融合方案失败" }, { status: 500 }); }
}
