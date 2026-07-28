import { eq, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { visualSettings } from "@/db/schema";

const ALLOWED_PAGES = new Set(["dashboard", "framework", "analyze", "history", "records", "growth", "topics", "cabinet", "new", "trash", "knowledge", "integration"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 15 * 1024 * 1024;

type FilesBucket = {
  put(key: string, value: ReadableStream<Uint8Array>, options?: unknown): Promise<unknown>;
  delete(key: string): Promise<void>;
};

function bucket() { return (env as unknown as { FILES?: FilesBucket }).FILES; }
function json(payload: Record<string, unknown>, status: number, requestId: string) {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let objectKey = "";
  let stage = "validate";
  try {
    const page = request.headers.get("x-page") || "";
    const type = (request.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
    const size = Number(request.headers.get("x-file-size") || request.headers.get("content-length") || 0);
    if (!ALLOWED_PAGES.has(page)) return json({ error: "未知页面", requestId, stage }, 400, requestId);
    if (!ALLOWED_TYPES.has(type)) return json({ error: "仅支持 JPG、PNG 或 WebP 图片", requestId, stage }, 415, requestId);
    if (!Number.isFinite(size) || size <= 0) return json({ error: "没有收到图片内容", requestId, stage }, 400, requestId);
    if (size > MAX_SIZE) return json({ error: "图片不能超过 15 MB", requestId, stage }, 413, requestId);
    if (!request.body) return json({ error: "没有收到图片内容", requestId, stage }, 400, requestId);
    const files = bucket();
    if (!files) return json({ error: "R2 图片存储尚未绑定到当前站点", requestId, stage: "binding" }, 503, requestId);

    const [previous] = await getDb().select().from(visualSettings).where(eq(visualSettings.page, page)).limit(1);
    const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    objectKey = `backgrounds/${page}/${crypto.randomUUID()}.${extension}`;
    stage = "r2_put";
    await files.put(objectKey, request.body, { httpMetadata: { contentType: type } });

    stage = "d1_upsert";
    const updatedAt = new Date().toISOString();
    await getDb().insert(visualSettings).values({ page, objectKey, mimeType: type, updatedAt }).onConflictDoUpdate({
      target: visualSettings.page,
      set: { objectKey, mimeType: type, updatedAt: sql`excluded.updated_at` },
    });
    if (previous?.objectKey && previous.objectKey !== objectKey) await files.delete(previous.objectKey).catch(() => undefined);
    return json({ imageUrl: `/api/visual-settings/file?page=${encodeURIComponent(page)}&v=${encodeURIComponent(updatedAt)}`, updatedAt, requestId }, 201, requestId);
  } catch (error) {
    if (objectKey) await bucket()?.delete(objectKey).catch(() => undefined);
    const message = error instanceof Error ? error.message : "未知错误";
    console.error("visual_background_upload_failed", { requestId, stage, message });
    return json({ error: `背景上传在 ${stage} 阶段失败`, requestId, stage }, 500, requestId);
  }
}
