import { getD1 } from "@/db";

let schemaPromise: Promise<unknown> | null = null;

function ensureUsageSchema() {
  schemaPromise ||= getD1().prepare(`CREATE TABLE IF NOT EXISTS usage_daily (
    day TEXT PRIMARY KEY,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  return schemaPromise;
}

export async function GET() {
  try {
    await ensureUsageSchema();
    const result = await getD1().prepare("SELECT day, duration_seconds AS durationSeconds, last_seen_at AS lastSeenAt FROM usage_daily ORDER BY day DESC LIMIT 366").all();
    const days = result.results || [];
    const totalSeconds = days.reduce((sum, row) => sum + Number((row as { durationSeconds?: number }).durationSeconds || 0), 0);
    return Response.json({ days, totalSeconds });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取使用时长失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureUsageSchema();
    const payload = (await request.json().catch(() => ({}))) as { day?: string; deltaSeconds?: number };
    const day = /^\d{4}-\d{2}-\d{2}$/.test(payload.day || "") ? payload.day! : new Date().toISOString().slice(0, 10);
    const deltaSeconds = Math.max(1, Math.min(120, Math.round(Number(payload.deltaSeconds) || 0)));
    await getD1().prepare(`INSERT INTO usage_daily (day, duration_seconds, last_seen_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(day) DO UPDATE SET
        duration_seconds = usage_daily.duration_seconds + excluded.duration_seconds,
        last_seen_at = CURRENT_TIMESTAMP`).bind(day, deltaSeconds).run();
    return Response.json({ ok: true, day, deltaSeconds });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "记录使用时长失败" }, { status: 500 });
  }
}
