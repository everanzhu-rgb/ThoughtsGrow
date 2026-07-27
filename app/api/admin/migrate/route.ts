import { env } from "cloudflare:workers";
import { ensureSchema, getD1 } from "@/db";

const AUTH_HASH = "521e6aa75ba6296c18110cb654378cc4fcd28205c0cf4e172cf15f2e3763c968";

const tableColumns = {
  thinking_records: ["id", "title", "content", "scene", "mode", "status", "summary", "primary_issue", "source", "source_url", "note", "tags_json", "importance", "annotations_json", "analysis_report_json", "report_content", "next_review_at", "review_count", "merged_from_json", "framework_version", "created_at", "updated_at", "deleted_at", "delete_after"],
  analysis_versions: ["id", "record_id", "version", "structure_json", "assessments_json", "issues_json", "framework_version", "created_at"],
  conversation_turns: ["id", "record_id", "kind", "role", "content", "turn_number", "created_at"],
  training_sessions: ["id", "record_id", "topic_id", "focus_element", "focus_standard", "before_score", "after_score", "status", "created_at"],
  training_topics: ["id", "name", "description", "focus_element", "focus_standard", "status", "session_count", "created_at"],
  training_reports: ["id", "title", "source", "source_url", "domain", "article_excerpt", "report_content", "analysis_json", "created_at"],
  assessment_frameworks: ["id", "name", "version", "description", "definition_json", "status", "created_at"],
  knowledge_imports: ["id", "content", "source", "note", "analysis_json", "disposition", "created_at", "updated_at", "deleted_at", "delete_after"],
  source_materials: ["id", "kind", "name", "source_url", "object_key", "mime_type", "size_bytes", "extracted_text", "created_at"],
  inspiration_favorites: ["id", "quote", "author", "language", "translation", "source", "created_at"],
  framework_node_positions: ["node_id", "x", "y", "updated_at"],
  framework_node_notes: ["id", "node_id", "title", "content", "created_at", "updated_at"],
  activity_events: ["id", "kind", "summary", "occurred_at"],
  cabinet_items: ["id", "kind", "title", "content", "source", "image_url", "note", "created_at"],
  base_spaces: ["id", "name", "kind", "description", "scope", "status", "created_at", "updated_at"],
  base_nodes: ["id", "space_id", "parent_id", "node_type", "title", "content", "operational_json", "sort_order", "status", "created_at", "updated_at"],
  base_node_links: ["id", "from_node_id", "to_node_id", "relation", "label", "created_at"],
  base_node_questions: ["id", "node_id", "question", "rationale", "trigger", "completion", "sort_order", "status", "created_at", "updated_at"],
  record_node_links: ["id", "record_id", "node_id", "relation", "note", "created_at"],
  record_relations: ["id", "from_record_id", "to_record_id", "relation", "reason", "status", "created_at"],
  record_folders: ["id", "name", "parent_id", "sort_order", "created_at", "updated_at"],
  record_folder_links: ["id", "folder_id", "record_id", "created_at"],
  integration_proposals: ["id", "record_id", "status", "proposal_json", "created_at", "updated_at"],
  base_versions: ["id", "space_id", "version_number", "title", "summary", "snapshot_json", "source_record_ids_json", "status", "created_at"],
  visual_settings: ["page", "object_key", "mime_type", "updated_at"],
} as const;

type TableName = keyof typeof tableColumns;
type MigrationRow = Record<string, string | number | null>;

function camelKey(column: string) {
  return column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

async function authorized(request: Request) {
  const key = request.headers.get("x-migration-key") || "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("") === AUTH_HASH;
}

function bucket() {
  return (env as unknown as { FILES?: R2Bucket }).FILES;
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  if (url.searchParams.get("action") === "file") {
    const objectKey = url.searchParams.get("key") || "";
    if (!objectKey || (!objectKey.startsWith("materials/") && !objectKey.startsWith("visuals/"))) {
      return Response.json({ error: "Invalid object key" }, { status: 400 });
    }
    const files = bucket();
    if (!files || !request.body) return Response.json({ error: "R2 unavailable" }, { status: 503 });
    await files.put(objectKey, request.body, { httpMetadata: { contentType: request.headers.get("content-type") || "application/octet-stream" } });
    return Response.json({ ok: true, objectKey });
  }

  await ensureSchema();
  const payload = await request.json() as { table?: string; rows?: MigrationRow[]; replaceAll?: boolean };
  if (!payload.table || !(payload.table in tableColumns) || !Array.isArray(payload.rows)) {
    return Response.json({ error: "Invalid migration payload" }, { status: 400 });
  }

  const table = payload.table as TableName;
  const columns = tableColumns[table];
  const placeholders = columns.map(() => "?").join(", ");
  const statement = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
  const d1 = getD1();
  const queries = payload.rows.map((row) => d1.prepare(statement).bind(...columns.map((column) => row[camelKey(column)] ?? null)));
  if (payload.replaceAll) queries.unshift(d1.prepare(`DELETE FROM ${table}`));
  if (queries.length) await d1.batch(queries);
  return Response.json({ ok: true, table, count: payload.rows.length });
}
