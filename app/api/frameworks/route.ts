import { desc } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { assessmentFrameworks } from "@/db/schema";

const baseDefinition = {
  elements: ["目的", "问题", "信息", "解释与推理", "概念", "假设", "结果与意义", "观点"],
  standards: ["清晰性", "准确性", "精确性", "相关性", "深度", "广度", "逻辑性", "重要性", "公正性"],
  capabilities: ["批判性思维", "逻辑推理", "问题分析", "决策能力", "反思能力"],
};

export async function GET() {
  try {
    await ensureSchema();
    const db = getDb();
    let frameworks = await db
      .select()
      .from(assessmentFrameworks)
      .orderBy(desc(assessmentFrameworks.createdAt));
    if (frameworks.length === 0) {
      const [created] = await db
        .insert(assessmentFrameworks)
        .values({
          id: crypto.randomUUID(),
          name: "Critical Thinking Base",
          version: "V1.0",
          description: "以 8 个思维元素 × 9 个思维标准为核心的证据驱动评估基座。",
          definitionJson: JSON.stringify(baseDefinition),
          status: "active",
        })
        .returning();
      frameworks = [created];
    }
    return Response.json({ frameworks });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "读取评估体系失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as {
      name?: string;
      version?: string;
      description?: string;
      definition?: unknown;
    };
    const [framework] = await getDb()
      .insert(assessmentFrameworks)
      .values({
        id: crypto.randomUUID(),
        name: payload.name?.trim() || "Critical Thinking Base",
        version: payload.version?.trim() || "V1.1",
        description: payload.description?.trim() || "",
        definitionJson: JSON.stringify(payload.definition ?? baseDefinition),
        status: "active",
      })
      .returning();
    return Response.json({ framework }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "保存评估体系失败" },
      { status: 500 },
    );
  }
}
