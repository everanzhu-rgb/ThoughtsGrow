import { desc } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureSchema, getDb } from "@/db";
import { sourceMaterials } from "@/db/schema";

const allowedExtensions = new Set(["txt", "md", "markdown", "pdf", "doc", "docx", "ppt", "pptx"]);

function filesBucket() {
  return (env as unknown as { FILES?: { put(key: string, value: ArrayBuffer, options?: unknown): Promise<unknown> } }).FILES;
}

function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function safeExternalUrl(raw: string) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("只支持 http 或 https 链接");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw new Error("不支持本地或内网链接");
  return url;
}

export async function GET() {
  try {
    await ensureSchema();
    const materials = await getDb().select().from(sourceMaterials).orderBy(desc(sourceMaterials.createdAt)).limit(20);
    return Response.json({ materials });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取材料失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const extractedText = String(form.get("extractedText") || "").slice(0, 120000);
      if (!(file instanceof File)) return Response.json({ error: "没有收到文件" }, { status: 400 });
      if (file.size > 20 * 1024 * 1024) return Response.json({ error: "单个文件不能超过 20MB" }, { status: 400 });
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedExtensions.has(extension)) return Response.json({ error: "暂不支持这种文件格式" }, { status: 400 });
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_");
      const objectKey = `materials/${id}/${safeName}`;
      const bucket = filesBucket();
      if (!bucket) throw new Error("文件存储尚未配置");
      await bucket.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
      const [material] = await getDb().insert(sourceMaterials).values({ id, kind: "file", name: file.name, objectKey, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, extractedText }).returning();
      return Response.json({ material }, { status: 201 });
    }

    const payload = (await request.json()) as { url?: string };
    const url = safeExternalUrl(payload.url?.trim() || "");
    const response = await fetch(url, { headers: { "User-Agent": "Xuli-Thought-Library/1.0" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`链接读取失败（${response.status}）`);
    const type = response.headers.get("content-type") || "text/html";
    if (!type.includes("text") && !type.includes("json") && !type.includes("xml")) throw new Error("该链接不是可直接读取的文本页面");
    const raw = (await response.text()).slice(0, 300000);
    const extractedText = (type.includes("html") ? cleanHtml(raw) : raw).slice(0, 120000);
    const id = crypto.randomUUID();
    const [material] = await getDb().insert(sourceMaterials).values({ id, kind: "link", name: url.hostname, sourceUrl: url.toString(), mimeType: type, sizeBytes: raw.length, extractedText }).returning();
    return Response.json({ material }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "导入材料失败" }, { status: 400 });
  }
}
