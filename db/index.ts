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
    d1.prepare(`CREATE TABLE IF NOT EXISTS base_node_questions (
      id TEXT PRIMARY KEY, node_id TEXT NOT NULL, question TEXT NOT NULL,
      rationale TEXT NOT NULL DEFAULT '', trigger TEXT NOT NULL DEFAULT '', completion TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS record_node_links (
      id TEXT PRIMARY KEY, record_id TEXT NOT NULL, node_id TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'source', note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS record_relations (
      id TEXT PRIMARY KEY, from_record_id TEXT NOT NULL, to_record_id TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'related', reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS record_folders (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS record_folder_links (
      id TEXT PRIMARY KEY, folder_id TEXT NOT NULL, record_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    d1.prepare(`CREATE TABLE IF NOT EXISTS visual_settings (
      page TEXT PRIMARY KEY, object_key TEXT NOT NULL, mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    d1.prepare(`INSERT OR IGNORE INTO base_node_questions (id,node_id,question,rationale,trigger,completion,sort_order) VALUES
      ('q-purpose-1','meta-purpose','我现在究竟要理解、判断还是决定什么？','先确定任务类型，避免拿错误的证据回答错误的问题。','开始任何分析时','能用一句具体的话写出核心任务',10),
      ('q-evidence-1','meta-evidence','哪些是可核验事实，哪些只是观点或推断？','把材料分层，防止让推测支撑另一层推测。','文本同时包含事实与结论时','每个关键判断都能标明证据类型',20),
      ('q-assumption-1','meta-assumption','这个结论成立还依赖哪些没有说出的条件？','从结论反推必要条件，找到最容易断裂的推理连接。','结论看似自然却缺少连接时','至少找到一个可验证的隐含前提',30),
      ('q-perspective-1','meta-perspective','还有什么同样能解释这些事实的观点？','主动生成替代解释，检验当前观点是否过早收敛。','出现单一解释时','形成一个有证据依据的替代观点',40),
      ('q-consequence-1','meta-consequence','如果照此行动，短期、长期和意外后果分别是什么？','把结果展开到不同时间尺度和相关人群。','判断将导向行动时','主要受益者、风险与修正条件清楚',50)`),
    d1.prepare(`INSERT OR IGNORE INTO base_nodes (id,space_id,parent_id,node_type,title,content,operational_json,sort_order) VALUES
      ('meta-clarify','meta-core',NULL,'method','标准化定位','先界定任务、概念和表达，使问题进入可讨论、可检验的状态。','{}',70),
      ('meta-clarity','meta-core','meta-clarify','method','清晰性','用定义、复述和例子消除含混；能说清自己究竟在谈什么。','{}',71),
      ('meta-precision','meta-core','meta-clarify','method','精确性','从笼统判断继续追问范围、程度、时间、对象和可观察细节。','{}',72),
      ('meta-essence','meta-core',NULL,'method','本质洞察','穿过表面表述，识别现象背后的核心概念、机制与第一性约束。','{}',80),
      ('meta-depth','meta-core','meta-essence','method','深度','追问原因、机制、困难与隐含前提，避免停留在第一层解释。','{}',81),
      ('meta-pattern','meta-core',NULL,'method','模式识别','寻找分类、相似案例、差异和跨情境可复用的结构。','{}',90),
      ('meta-relevance','meta-core','meta-pattern','method','相关性','检查信息是否真正帮助回答核心问题，区分关键线索与噪音。','{}',91),
      ('meta-breadth','meta-core','meta-pattern','method','广度','主动寻找其他立场、学科视角、尺度和替代解释。','{}',92),
      ('meta-reasoning','meta-core',NULL,'method','分析推理','把证据、前提与结论连接成可复查的推理链，并说明每一步怎样移动。','{}',100),
      ('meta-accuracy','meta-core','meta-reasoning','method','准确性','核验事实、来源与推断边界，让关键判断能够被复查。','{}',101),
      ('meta-logic','meta-core','meta-reasoning','method','逻辑性','检查结论是否由前提支持、各部分是否一致以及是否存在跳步。','{}',102),
      ('meta-value','meta-core',NULL,'method','价值评估','比较重要性、公正性和后果，说明判断服务于谁、牺牲什么。','{}',110),
      ('meta-importance','meta-core','meta-value','method','重要性','从众多事实中识别真正改变判断或行动的关键变量。','{}',111),
      ('meta-fairness','meta-core','meta-value','method','公正性','检查利益、立场和双重标准，公平呈现强有力的反方观点。','{}',112)`),
    d1.prepare(`INSERT OR IGNORE INTO base_node_questions (id,node_id,question,rationale,trigger,completion,sort_order) VALUES
      ('q-clarity-1','meta-clarity','如果要让一个完全不了解背景的人听懂，我需要定义什么、举什么例子？','用费曼式复述暴露概念中的模糊地带。','概念或判断含混时','给出定义、自己的复述和至少一个例子',60),
      ('q-precision-1','meta-precision','这里的对象、范围、程度和时间具体是什么？','把宽泛表达拆成可观察的限定条件。','出现总是、很多、有效等笼统词时','关键限定词已经补齐',70),
      ('q-depth-1','meta-depth','这个现象背后的机制是什么，结论依赖哪些更深层条件？','从现象向机制和条件继续下钻。','解释停留在表面相关性时','至少形成一条可检验的机制链',80),
      ('q-relevance-1','meta-relevance','这条信息究竟帮助回答核心问题的哪一部分？','迫使每条证据与问题建立明确连接。','材料很多但主线模糊时','能说明保留或删除每条信息的理由',90),
      ('q-breadth-1','meta-breadth','换一个立场、学科或时间尺度，会得到什么不同解释？','系统性打开视角，而不是泛泛地说还有别的看法。','解释过早收敛时','至少形成一个有依据的替代解释',100),
      ('q-accuracy-1','meta-accuracy','我怎样验证这条信息，它是事实、解释还是推测？','把准确性变成来源核验和类型标注两个动作。','关键判断依赖外部信息时','来源可复查且事实与推断已分开',110),
      ('q-logic-1','meta-logic','从这些前提到这个结论，中间是否缺少一步？','把直觉跳跃改写成显式推理连接。','出现所以、因此等结论词时','每个结论都能指出其前提和推理规则',120),
      ('q-importance-1','meta-importance','如果只能保留三个变量，哪些最可能改变最终判断？','通过反事实删减识别真正关键的信息。','信息很多且权重不明时','关键变量及其影响方向清楚',130),
      ('q-fairness-1','meta-fairness','我是否能用对方会认可的方式陈述最强反方观点？','用钢人化检验立场偏差和双重标准。','涉及利益或价值冲突时','反方观点被准确呈现且标准一致',140)`),
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
    d1.prepare("CREATE INDEX IF NOT EXISTS base_node_questions_node_idx ON base_node_questions(node_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS record_node_links_record_idx ON record_node_links(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS record_relations_from_idx ON record_relations(from_record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS record_relations_to_idx ON record_relations(to_record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS record_folder_links_folder_idx ON record_folder_links(folder_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS record_folder_links_record_idx ON record_folder_links(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS integration_record_idx ON integration_proposals(record_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS base_versions_space_idx ON base_versions(space_id)"),
  ]);
}
