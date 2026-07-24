import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureSchema, getDb } from "@/db";
import { sourceMaterials } from "@/db/schema";

type R2Object = { body: ReadableStream; httpMetadata?: { contentType?: string }; size?: number };
function filesBucket() { return (env as unknown as { FILES?: { get(key: string): Promise<R2Object | null> } }).FILES; }

export async function GET(request: Request) {
  try {
    await ensureSchema(); const id = new URL(request.url).searchParams.get("id"); if (!id) return new Response("Missing material id", { status: 400 });
    const [material] = await getDb().select().from(sourceMaterials).where(eq(sourceMaterials.id, id)).limit(1);
    if (!material?.objectKey) return new Response("Not found", { status: 404 });
    const object = await filesBucket()?.get(material.objectKey); if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || material.mimeType, "Cache-Control": "private, max-age=86400", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(material.name)}` } });
  } catch { return new Response("Unable to read file", { status: 500 }); }
}
