import { desc } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureSchema, getDb } from "@/db";
import { sourceMaterials } from "@/db/schema";
import { deepSeekJson } from "@/lib/deepseek";

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

const blockedSignals = ["安全验证", "环境异常", "访问过于频繁", "登录知乎", "captcha", "verify you are human", "access denied"];

async function fetchPublicPage(initialUrl: URL) {
  let current = initialUrl;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(current, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.7",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        Referer: `${current.protocol}//${current.host}/`,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("链接跳转地址缺失");
      current = safeExternalUrl(new URL(location, current).toString());
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new Error("链接跳转次数过多");
}

function looksBlocked(text: string) {
  const lower = text.toLowerCase();
  return text.trim().length < 300 || blockedSignals.some((signal) => lower.includes(signal.toLowerCase()));
}

async function readerFallback(url: URL) {
  const response = await fetch(`https://r.jina.ai/${url.toString()}`, {
    headers: { Accept: "text/plain", "x-engine": "browser", "x-retain-links": "text", "x-no-cache": "true" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`增强读取失败（${response.status}）`);
  return (await response.text()).slice(0, 300000);
}

function isPrimarilyEnglish(text: string) {
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  return latin > 500 && latin > cjk * 3;
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
    let raw = "";
    let type = "text/html";
    let finalUrl = url;
    let enhanced = false;
    try {
      const direct = await fetchPublicPage(url);
      finalUrl = direct.finalUrl;
      if (!direct.response.ok) throw new Error(`直接读取失败（${direct.response.status}）`);
      type = direct.response.headers.get("content-type") || "text/html";
      if (!type.includes("text") && !type.includes("json") && !type.includes("xml")) throw new Error("该链接不是可直接读取的文本页面");
      raw = (await direct.response.text()).slice(0, 300000);
    } catch {
      raw = "";
    }
    let extractedText = (type.includes("html") ? cleanHtml(raw) : raw).slice(0, 120000);
    const restrictedHost = /(^|\.)(weixin\.qq\.com|zhihu\.com)$/.test(url.hostname);
    if (restrictedHost || looksBlocked(extractedText)) {
      const readerText = await readerFallback(url);
      if (!looksBlocked(readerText)) {
        raw = readerText;
        type = "text/markdown";
        extractedText = readerText.slice(0, 120000);
        enhanced = true;
      }
    }
    if (looksBlocked(extractedText)) throw new Error("该页面仍拒绝自动读取。请确认文章公开可访问，或复制正文后导入。");
    if (isPrimarilyEnglish(extractedText)) {
      try {
        const summary = await deepSeekJson<{ summaryZh: string; summaryEn: string }>([
          { role: "system", content: "你是双语知识编辑。请返回 JSON：summaryZh 用中文概括文章精义，summaryEn 用英文概括同一内容。两段各 80-160 字，忠实原文，不补充不存在的信息。" },
          { role: "user", content: extractedText.slice(0, 30000) },
        ]);
        extractedText = `## 双语摘要 / Bilingual Summary\n\n### 中文\n\n${summary.summaryZh}\n\n### English\n\n${summary.summaryEn}\n\n---\n\n## 原文摘取 / Extracted Text\n\n${extractedText}`.slice(0, 120000);
      } catch {
        // The readable article remains available even if bilingual summarization is temporarily unavailable.
      }
    }
    const id = crypto.randomUUID();
    const [material] = await getDb().insert(sourceMaterials).values({ id, kind: "link", name: finalUrl.hostname, sourceUrl: finalUrl.toString(), mimeType: type, sizeBytes: raw.length, extractedText }).returning();
    return Response.json({ material: { ...material, enhanced } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "导入材料失败" }, { status: 400 });
  }
}
