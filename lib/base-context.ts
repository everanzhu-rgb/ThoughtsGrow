import { asc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { baseNodes, baseSpaces } from "@/db/schema";

export type ActiveFlow = { id: string; name: string; steps: Array<{ title: string; question: string; why: string; done: string }> };

export async function activeAnalysisFlow(): Promise<ActiveFlow | null> {
  await ensureSchema();
  const nodes = await getDb().select().from(baseNodes).where(eq(baseNodes.status, "active")).orderBy(asc(baseNodes.sortOrder));
  const playbook = nodes.find((node) => node.nodeType === "playbook" && node.spaceId === "meta-core") || nodes.find((node) => node.nodeType === "playbook");
  if (!playbook) return null;
  try {
    const parsed = JSON.parse(playbook.operationalJson || "{}") as { steps?: ActiveFlow["steps"] };
    const steps = (parsed.steps || []).filter((step) => step.title && step.question);
    return steps.length ? { id: playbook.id, name: playbook.title, steps } : null;
  } catch { return null; }
}

export async function activeBaseBrief() {
  await ensureSchema();
  const db = getDb();
  const spaces = await db.select().from(baseSpaces).where(eq(baseSpaces.status, "active"));
  const nodes = await db.select().from(baseNodes).where(eq(baseNodes.status, "active")).orderBy(asc(baseNodes.sortOrder));
  const blocks = spaces.map((space) => {
    const own = nodes.filter((node) => node.spaceId === space.id).slice(0, 30).map((node) => {
      let steps = "";
      try { const parsed = JSON.parse(node.operationalJson || "{}") as { steps?: Array<{ title?: string; question?: string }> }; if (parsed.steps?.length) steps = `；流程：${parsed.steps.map((step) => `${step.title}:${step.question}`).join(" → ")}`; } catch { steps = ""; }
      return `- [${node.nodeType}] ${node.title}：${node.content}${steps}`;
    }).join("\n");
    return `## ${space.name}（${space.kind === "meta" ? "元认知" : "领域"}）\n范围：${space.scope}\n${blocksOrEmpty(own)}`;
  });
  return `这是用户当前正式生效、可编辑的个人思维基座。必须优先使用其中的方法与流程，不能假装它仍是固定模板。\n${blocks.join("\n\n")}`;
}

function blocksOrEmpty(value: string) { return value || "- 当前尚无认知节点"; }
