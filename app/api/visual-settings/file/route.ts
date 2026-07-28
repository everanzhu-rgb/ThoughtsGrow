import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { visualSettings } from "@/db/schema";

type R2Object = { body: ReadableStream; httpMetadata?: { contentType?: string } };
function filesBucket() {
  return (env as unknown as { FILES?: { get(key: string): Promise<R2Object | null> } }).FILES;
}

export async function GET(request: Request) {
  try {
    const page = new URL(request.url).searchParams.get("page");
    if (!page) return new Response("Missing page", { status: 400 });
    const [setting] = await getDb().select().from(visualSettings).where(eq(visualSettings.page, page)).limit(1);
    if (!setting) return new Response("Not found", { status: 404 });
    const object = await filesBucket()?.get(setting.objectKey);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || setting.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Unable to read background", { status: 500 });
  }
}
