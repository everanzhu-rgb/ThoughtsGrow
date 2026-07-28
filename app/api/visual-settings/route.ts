import { eq, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { visualSettings } from "@/db/schema";

const ALLOWED_PAGES = new Set(["dashboard", "framework", "analyze", "history", "records", "growth", "topics", "cabinet", "new", "trash", "knowledge", "integration"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type FilesBucket = {
  put(key: string, value: ArrayBuffer, options?: unknown): Promise<unknown>;
  delete(key: string): Promise<void>;
};

function filesBucket() {
  return (env as unknown as { FILES?: FilesBucket }).FILES;
}

function validPage(raw: FormDataEntryValue | string | null) {
  const page = String(raw || "");
  if (!ALLOWED_PAGES.has(page)) throw new Error("未知页面");
  return page;
}

export async function GET(request: Request) {
  try {
    const page = validPage(new URL(request.url).searchParams.get("page"));
    const [setting] = await getDb().select().from(visualSettings).where(eq(visualSettings.page, page)).limit(1);
    if (!setting) return Response.json({ imageUrl: null });
    return Response.json({
      imageUrl: `/api/visual-settings/file?page=${encodeURIComponent(page)}&v=${encodeURIComponent(setting.updatedAt)}`,
      updatedAt: setting.updatedAt,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取背景失败" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const page = validPage(form.get("page"));
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "没有收到图片" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "仅支持 JPG、PNG 或 WebP" }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) return Response.json({ error: "图片不能超过 15 MB" }, { status: 400 });

    const bucket = filesBucket();
    if (!bucket) throw new Error("服务器图片存储尚未配置");
    const [previous] = await getDb().select().from(visualSettings).where(eq(visualSettings.page, page)).limit(1);
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const objectKey = `backgrounds/${page}/${crypto.randomUUID()}.${extension}`;
    await bucket.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    const updatedAt = new Date().toISOString();
    await getDb().insert(visualSettings).values({ page, objectKey, mimeType: file.type, updatedAt }).onConflictDoUpdate({
      target: visualSettings.page,
      set: { objectKey, mimeType: file.type, updatedAt: sql`excluded.updated_at` },
    });
    if (previous?.objectKey && previous.objectKey !== objectKey) await bucket.delete(previous.objectKey).catch(() => undefined);
    return Response.json({ imageUrl: `/api/visual-settings/file?page=${encodeURIComponent(page)}&v=${encodeURIComponent(updatedAt)}`, updatedAt });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "上传背景失败" }, { status: 400 });
  }
}
