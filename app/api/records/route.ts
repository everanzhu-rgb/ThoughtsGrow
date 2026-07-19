import { desc } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { thinkingRecords } from "@/db/schema";

export async function GET() {
  try {
    await ensureSchema();
    const records = await getDb()
      .select()
      .from(thinkingRecords)
      .orderBy(desc(thinkingRecords.createdAt))
      .limit(100);
    return Response.json({ records });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "读取记录失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as {
      title?: string;
      content?: string;
      scene?: string;
      mode?: string;
    };
    const content = payload.content?.trim() ?? "";
    if (content.length < 10) {
      return Response.json(
        { error: "请至少写下 10 个字，帮助系统理解这次思考。" },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const title =
      payload.title?.trim() ||
      `${payload.scene || "思维"}记录 · ${new Date().toLocaleDateString("zh-CN")}`;
    const [record] = await getDb()
      .insert(thinkingRecords)
      .values({
        id,
        title,
        content,
        scene: payload.scene || "日常思考",
        mode: payload.mode || "record",
        status: "saved",
      })
      .returning();

    return Response.json({ record }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 },
    );
  }
}
