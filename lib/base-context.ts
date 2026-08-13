import { asc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { baseNodeQuestions, baseNodes, baseSpaces } from "@/db/schema";

export type ActiveFlow = { id: string; name: string; steps: Array<{ title: string; question: string; why: string; done: string }> };
type StoredFlowStep = ActiveFlow["steps"][number] & { kind?: "module" | "question"; depth?: number };

export async function activeAnalysisFlow(spaceId = "meta-core"): Promise<ActiveFlow | null> {
  await ensureSchema();
  const nodes = await getDb().select().from(baseNodes).where(eq(baseNodes.status, "active")).orderBy(asc(baseNodes.sortOrder));
  const playbook = nodes.find((node) => node.nodeType === "playbook" && node.spaceId === spaceId) || nodes.find((node) => node.nodeType === "playbook" && node.spaceId === "meta-core") || nodes.find((node) => node.nodeType === "playbook");
  if (!playbook) return null;
  try {
    const parsed = JSON.parse(playbook.operationalJson || "{}") as { steps?: StoredFlowStep[] };
    const hierarchy: string[] = [];
    const steps: ActiveFlow["steps"] = [];
    for (const step of parsed.steps || []) {
      const depth = Math.max(0, Number.isFinite(step.depth) ? Number(step.depth) : 0);
      if (step.kind === "module") {
        if (!step.title) continue;
        hierarchy[depth] = step.title;
        hierarchy.length = depth + 1;
        continue;
      }
      if (!step.title || !step.question) continue;
      const path = hierarchy.slice(0, depth).filter(Boolean);
      steps.push({ title: path.length ? `${path.join(" → ")} · ${step.title}` : step.title, question: step.question, why: step.why, done: step.done });
    }
    return steps.length ? { id: playbook.id, name: playbook.title, steps } : null;
  } catch { return null; }
}

export async function activeBaseBrief(spaceId = "meta-core") {
  await ensureSchema();
  const db = getDb();
  const spaces = await db.select().from(baseSpaces).where(eq(baseSpaces.status, "active"));
  const nodes = await db.select().from(baseNodes).where(eq(baseNodes.status, "active")).orderBy(asc(baseNodes.sortOrder));
  const questions = await db.select().from(baseNodeQuestions).where(eq(baseNodeQuestions.status, "active")).orderBy(asc(baseNodeQuestions.sortOrder));
  const includedIds = new Set(spaceId === "meta-core" ? ["meta-core"] : ["meta-core", spaceId]);
  const includedSpaces = spaces.filter((space) => includedIds.has(space.id));
  const blocks = includedSpaces.map((space) => {
    const ownNodes = nodes.filter((node) => node.spaceId === space.id);
    const depth = (node: typeof baseNodes.$inferSelect) => { let level = 0; let current = node; const seen = new Set<string>(); while (current.parentId && !seen.has(current.parentId)) { seen.add(current.parentId); const parent = ownNodes.find((item) => item.id === current.parentId); if (!parent) break; level += 1; current = parent; } return level; };
    const own = ownNodes.slice(0, 60).map((node) => {
      let steps = "";
      try { const parsed = JSON.parse(node.operationalJson || "{}") as { steps?: StoredFlowStep[] }; const executable = (parsed.steps || []).filter((step) => step.kind !== "module" && step.question); if (executable.length) steps = `；流程：${executable.map((step) => `${step.title}:${step.question}`).join(" → ")}`; } catch { steps = ""; }
      const prompts = questions.filter((item) => item.nodeId === node.id).map((item) => `「${item.question}」；构建依据：${item.rationale || "未填写"}；触发条件：${item.trigger || "通用"}；完成标准：${item.completion || "未填写"}`).join(" | ");
      return `${"  ".repeat(depth(node))}- ${node.title}：${node.content}${steps}${prompts ? `；可用启发式问题：${prompts}` : ""}`;
    }).join("\n");
    return `## ${space.name}（${space.kind === "meta" ? "元认知" : "领域"}）\n范围：${space.scope}\n${blocksOrEmpty(own)}`;
  });
  return `这是用户当前正式生效、可编辑的个人思维基座。所选基座为 ${includedSpaces.find((space) => space.id === spaceId)?.name || "万象思维基座"}。如果选择领域基座，万象基座提供通用元认知骨架，领域基座提供专业约束。必须遵循树的父子层级、节点说明和用户维护的启发式问题，不能用隐藏模板替代。\n${blocks.join("\n\n")}`;
}

function blocksOrEmpty(value: string) { return value || "- 当前尚无认知节点"; }
