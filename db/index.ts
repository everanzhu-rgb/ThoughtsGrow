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
      source TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      importance INTEGER NOT NULL DEFAULT 3,
      annotations_json TEXT NOT NULL DEFAULT '[]',
      analysis_report_json TEXT NOT NULL DEFAULT '{}',
      report_content TEXT NOT NULL DEFAULT '',
      next_review_at TEXT,
      review_count INTEGER NOT NULL DEFAULT 0,
      merged_from_json TEXT NOT NULL DEFAULT '[]',
      framework_version TEXT NOT NULL DEFAULT 'Critical Thinking Base V1.0',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      delete_after TEXT
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
    d1.prepare(`CREATE TABLE IF NOT EXISTS training_reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      article_excerpt TEXT NOT NULL DEFAULT '',
      report_content TEXT NOT NULL DEFAULT '',
      analysis_json TEXT NOT NULL DEFAULT '{}',
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
    d1.prepare(`CREATE TABLE IF NOT EXISTS knowledge_imports (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      analysis_json TEXT NOT NULL DEFAULT '{}',
      disposition TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      delete_after TEXT
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS source_materials (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      source_url TEXT,
      object_key TEXT,
      mime_type TEXT NOT NULL DEFAULT 'text/plain',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      extracted_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS inspiration_favorites (
      id TEXT PRIMARY KEY,
      quote TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'zh',
      translation TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS framework_node_positions (
      node_id TEXT PRIMARY KEY,
      x REAL NOT NULL,
      y REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS framework_node_notes (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS cabinet_items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'quote',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS base_spaces (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'domain',
      description TEXT NOT NULL DEFAULT '', scope TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS base_nodes (
      id TEXT PRIMARY KEY, space_id TEXT NOT NULL, parent_id TEXT, node_type TEXT NOT NULL DEFAULT 'method',
      title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', operational_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS base_node_links (
      id TEXT PRIMARY KEY, from_node_id TEXT NOT NULL, to_node_id TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'related', label TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS record_node_links (
      id TEXT PRIMARY KEY, record_id TEXT NOT NULL, node_id TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'source', note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS integration_proposals (
      id TEXT PRIMARY KEY, record_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', proposal_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS base_versions (
      id TEXT PRIMARY KEY, space_id TEXT NOT NULL, version_number INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', snapshot_json TEXT NOT NULL DEFAULT '{}',
      source_record_ids_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`INSERT OR IGNORE INTO base_spaces (id,name,kind,description,scope) VALUES
      ('meta-core','万象思维基座','meta','负责跨领域的问题界定、证据判断、推理、反思与修正。','所有需要理解、判断、决策与创造的情境'),
      ('domain-research','科研与学术','domain','以研究问题、证据链、方法边界和学术交流为核心的领域基座。','研究设计、论文阅读、学术写作与科研决策'),
      ('domain-humanities','人文与历史','domain','理解文本、历史语境、价值冲突与多重解释。','历史、人文、文化与社会思想')`),
    d1.prepare(`INSERT OR IGNORE INTO base_nodes (id,space_id,node_type,title,content,operational_json,sort_order) VALUES
      ('meta-purpose','meta-core','principle','先明确目的与问题','在搜集信息和评价观点之前，先说明自己究竟想理解、判断或解决什么。','{}',10),
      ('meta-evidence','meta-core','method','区分事实、观点与推断','把文本中的可核验事实、价值判断和由事实推出的解释分开，避免把推测当成事实。','{}',20),
      ('meta-assumption','meta-core','method','找出结论依赖的假设','追问结论要成立，哪些没有明说的条件必须同时为真。','{}',30),
      ('meta-perspective','meta-core','principle','寻找其他解释与立场','主动构建能够解释同一事实的替代观点，并检查自己的利益与立场。','{}',40),
      ('meta-consequence','meta-core','method','比较结果与意义','同时检查短期与长期、直接与间接、预期与非预期后果。','{}',50),
      ('meta-playbook','meta-core','playbook','从问题到暂定结论','一套面向初学者的通用思考流程。','{"steps":[{"title":"明确任务","question":"我现在究竟要理解、判断还是决定什么？","why":"不同任务需要不同证据。","done":"能用一句话说清核心问题"},{"title":"整理已知","question":"哪些是文本直接提供的事实，哪些只是观点或推断？","why":"先分层，才能避免用推测支撑推测。","done":"事实与推断已经分开"},{"title":"补出前提","question":"这个结论成立还依赖哪些没有说出的条件？","why":"隐含假设是推理最常断裂的地方。","done":"至少找到一个可验证前提"},{"title":"打开视角","question":"还有什么不同解释？谁会不同意，理由是什么？","why":"替代解释可以检验当前解释是否过早。","done":"形成一个有根据的替代观点"},{"title":"形成暂定判断","question":"在现有证据下，最稳妥的结论和保留条件是什么？","why":"好的判断允许未来证据继续修正。","done":"结论同时包含证据、信心与修正条件"}]}',60)`),
    d1.prepare("CREATE INDEX IF NOT EXISTS thinking_records_created_idx ON thinking_records(created_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS analysis_record_idx ON analysis_versions(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS conversation_record_idx ON conversation_turns(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS training_record_idx ON training_sessions(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS training_reports_created_idx ON training_reports(created_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS knowledge_imports_created_idx ON knowledge_imports(created_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS source_materials_created_idx ON source_materials(created_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS framework_node_notes_node_idx ON framework_node_notes(node_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS activity_events_occurred_idx ON activity_events(occurred_at)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS base_nodes_space_idx ON base_nodes(space_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS record_node_links_record_idx ON record_node_links(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS integration_record_idx ON integration_proposals(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS base_versions_space_idx ON base_versions(space_id)"),
  ]);
}
