import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getD1() {
  if (!env.DB) {
    throw new Error("持久化数据库暂不可用，请稍后重试。");
  }
  return env.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

export async function ensureSchema() {
  const d1 = getD1();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS thinking_records (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      scene TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'record',
      status TEXT NOT NULL DEFAULT 'saved',
      summary TEXT NOT NULL DEFAULT '',
      primary_issue TEXT NOT NULL DEFAULT '',
      framework_version TEXT NOT NULL DEFAULT 'Critical Thinking Base V1.0',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS analysis_versions (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      structure_json TEXT NOT NULL DEFAULT '{}',
      assessments_json TEXT NOT NULL DEFAULT '[]',
      issues_json TEXT NOT NULL DEFAULT '[]',
      framework_version TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS conversation_turns (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS training_sessions (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      topic_id TEXT,
      focus_element TEXT NOT NULL,
      focus_standard TEXT NOT NULL,
      before_score REAL NOT NULL,
      after_score REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS training_topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      focus_element TEXT NOT NULL,
      focus_standard TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      session_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS assessment_frameworks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      definition_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS thinking_records_created_idx ON thinking_records(created_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS analysis_record_idx ON analysis_versions(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS conversation_record_idx ON conversation_turns(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS training_record_idx ON training_sessions(record_id)"),
  ]);
}
