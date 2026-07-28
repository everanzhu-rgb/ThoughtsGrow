import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { sourceMaterials } from "@/db/schema";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

type FilesBucket = {
  put(key: string, value: ReadableStream<Uint8Array>, options?: unknown): Promise<unknown>;
  delete(key: string): Promise<void>;
};

function filesBucket() {
  return (env as unknown as { FILES?: FilesBucket }).FILES;
}

function json(payload: Record<string, unknown>, status: number, requestId: string) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store", "X-Request-ID": requestId },
  });
}

function originalName(request: Request) {
  const encoded = request.headers.get("x-file-name") || "image";
  try {
    return decodeURIComponent(encoded).slice(0, 240) || "image";
  } catch {
    return "image";
  }
}

function safeObjectName(name: string, contentType: string) {
  const fallback = contentType === "image/png" ? "png" : contentType === "image/gif" ? "gif" : contentType === "image/webp" ? "webp" : "jpg";
  const cleaned = name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_").replace(/^\.+/, "").slice(0, 180);
  return cleaned.includes(".") ? cleaned : `${cleaned || "image"}.${fallback}`;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let stage = "validate";
  let objectKey = "";
  try {
    const contentType = (request.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) return json({ error: "仅支持 JPG、PNG、GIF 或 WebP 图片", requestId, stage }, 415, requestId);

    const declaredSize = Number(request.headers.get("x-file-size") || request.headers.get("content-length") || 0);
    if (!Number.isFinite(declaredSize) || declaredSize <= 0) return json({ error: "无法确认图片大小，请重新选择文件", requestId, stage }, 400, requestId);
    if (declaredSize > MAX_IMAGE_SIZE) return json({ error: "图片不能超过 20 MB", requestId, stage }, 413, requestId);
    if (!request.body) return json({ error: "没有收到图片内容", requestId, stage }, 400, requestId);

    const bucket = filesBucket();
    if (!bucket) return json({ error: "R2 图片存储尚未绑定到当前站点", requestId, stage: "binding" }, 503, requestId);

    const id = crypto.randomUUID();
    const name = originalName(request);
    objectKey = `cabinet/${id}/${safeObjectName(name, contentType)}`;

    stage = "r2_put";
    await bucket.put(objectKey, request.body, { httpMetadata: { contentType } });

    stage = "d1_insert";
    const [material] = await getDb().insert(sourceMaterials).values({
      id,
      kind: "file",
      name,
      objectKey,
      mimeType: contentType,
      sizeBytes: declaredSize,
      extractedText: "",
    }).returning();

    return json({ material, requestId }, 201, requestId);
  } catch (error) {
    if (objectKey) await filesBucket()?.delete(objectKey).catch(() => undefined);
    const message = error instanceof Error ? error.message : "未知错误";
    console.error("cabinet_image_upload_failed", { requestId, stage, message });
    return json({ error: `图片上传在 ${stage} 阶段失败`, requestId, stage }, 500, requestId);
  }
}
