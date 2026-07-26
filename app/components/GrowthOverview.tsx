"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityHeatmap } from "./ActivityHeatmap";

type DayItem = { kind: string; summary: string; at: string };

export type GrowthRecord = {
  id: string;
  title: string;
  content: string;
  scene: string;
  source: string;
  note: string;
  summary: string;
  tagsJson: string;
  importance: number;
  createdAt: string;
};

type Evidence = {
  recordId: string;
  title: string;
  excerpt: string;
  source: string;
  basis: string;
  createdAt: string;
};

type RelationKind = "related" | "merge" | "duplicate" | "tension";
type Relation = { from: string; to: string; kind: RelationKind; weight: number; reason: string; confirmedId?: string };
type Space = { id: string; name: string; kind: string; description?: string; scope?: string };
type ConfirmedRelation = { id: string; fromRecordId: string; toRecordId: string; relation: RelationKind; reason: string };

const domainRules = [
  { name: "科研与学术", keywords: ["研究", "论文", "学术", "实验", "数据", "证据", "方法", "模型", "科研", "假说"] },
  { name: "认知与方法", keywords: ["思维", "认知", "批判", "逻辑", "假设", "概念", "问题", "推理", "判断", "框架"] },
  { name: "人文与历史", keywords: ["历史", "人文", "文化", "社会", "哲学", "文学", "文明", "政治", "伦理"] },
  { name: "决策与行动", keywords: ["决策", "选择", "计划", "目标", "行动", "执行", "风险", "策略", "复盘"] },
  { name: "沟通与关系", keywords: ["沟通", "讨论", "关系", "对话", "观点", "冲突", "表达", "合作", "他人"] },
  { name: "阅读与输入", keywords: ["阅读", "书", "文章", "课程", "笔记", "作者", "材料", "学习", "摘录"] },
] as const;

function list(value: string) {
  try { return JSON.parse(value || "[]") as string[]; } catch { return []; }
}

function compactText(value: string) {
  return value.replace(/[#>*_`~\[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
}

function excerpt(value: string, length = 96) {
  const clean = compactText(value);
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

function getDomainScores(record: GrowthRecord) {
  const tags = list(record.tagsJson);
  const haystack = `${record.title} ${record.scene} ${record.source} ${record.content} ${record.note} ${record.summary} ${tags.join(" ")}`.toLowerCase();
  return domainRules.map((rule) => {
    const hits = rule.keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
    const tagHits = tags.filter((tag) => rule.keywords.some((keyword) => tag.includes(keyword) || keyword.includes(tag)));
    return { name: rule.name, score: hits.length + tagHits.length * 2, hits: [...new Set([...hits, ...tagHits])] };
  }).sort((a, b) => b.score - a.score);
}

function primaryDomain(record: GrowthRecord) {
  const best = getDomainScores(record)[0];
  if (best?.score) return best.name;
  const tags = list(record.tagsJson);
  return record.scene?.trim() || tags[0] || "开放探索";
}

function buildFocus(records: GrowthRecord[]) {
  const groups = new Map<string, Evidence[]>();
  records.forEach((record) => {
    const scores = getDomainScores(record);
    const matched = scores.filter((item) => item.score > 0 && item.score >= Math.max(1, scores[0].score - 1)).slice(0, 2);
    const choices = matched.length ? matched : [{ name: primaryDomain(record), score: 1, hits: list(record.tagsJson).slice(0, 2) }];
    choices.forEach((choice) => {
      const evidence = groups.get(choice.name) || [];
      evidence.push({
        recordId: record.id,
        title: record.title || "未命名记录",
        excerpt: excerpt(record.summary || record.content || record.note) || "这条记录尚未形成摘要。",
        source: record.source,
        basis: choice.hits.length ? `命中：${choice.hits.join("、")}` : `来自场景：${record.scene || "未分类"}`,
        createdAt: record.createdAt,
      });
      groups.set(choice.name, evidence);
    });
  });
  return [...groups.entries()].map(([name, evidence]) => ({ name, evidence })).sort((a, b) => b.evidence.length - a.evidence.length).slice(0, 8);
}

function shingles(value: string) {
  const normalized = compactText(value).toLowerCase().replace(/[，。！？、：；“”‘’\s]/g, "");
  const result = new Set<string>();
  for (let index = 0; index < Math.min(normalized.length - 2, 420); index += 2) result.add(normalized.slice(index, index + 3));
  return result;
}

function similarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  left.forEach((token) => { if (right.has(token)) shared += 1; });
  return shared / (left.size + right.size - shared);
}

function buildRelations(records: GrowthRecord[]) {
  const relations: Relation[] = [];
  const tokenMap = new Map(records.map((record) => [record.id, shingles(`${record.title}${record.content}${record.summary}`)]));
  const negative = /并非|不是|反对|相反|错误|质疑|不能|不应|否定/;
  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const left = records[leftIndex]; const right = records[rightIndex];
      const leftTags = list(left.tagsJson); const rightTags = list(right.tagsJson);
      const sharedTags = leftTags.filter((tag) => rightTags.includes(tag));
      const score = similarity(tokenMap.get(left.id)!, tokenMap.get(right.id)!);
      const sameDomain = primaryDomain(left) === primaryDomain(right);
      const hasTension = score > .09 && negative.test(`${left.title}${left.content}`) !== negative.test(`${right.title}${right.content}`);
      let kind: RelationKind | null = null; let weight = 0; let reason = "";
      if (hasTension) { kind = "tension"; weight = score + .28; reason = "讨论对象相近，但表达了不同方向或边界，值得并置核对。"; }
      else if (score > .42) { kind = "duplicate"; weight = score + .3; reason = "核心表述高度接近，可能是同一认识的重复记录。"; }
      else if (score > .22 || sharedTags.length >= 2) { kind = "merge"; weight = score + sharedTags.length * .12; reason = `可以合并成更完整的方法条目${sharedTags.length ? `；共同标签：${sharedTags.join("、")}` : ""}。`; }
      else if (score > .07 || sharedTags.length || sameDomain) { kind = "related"; weight = score + sharedTags.length * .1 + (sameDomain ? .08 : 0); reason = sharedTags.length ? `共享主题：${sharedTags.join("、")}。` : `都在追问“${primaryDomain(left)}”中的相近问题。`; }
      if (kind) relations.push({ from: left.id, to: right.id, kind, weight, reason });
    }
  }
  const degree = new Map<string, number>();
  return relations.sort((a, b) => b.weight - a.weight).filter((relation) => {
    const fromDegree = degree.get(relation.from) || 0; const toDegree = degree.get(relation.to) || 0;
    if (fromDegree >= 4 || toDegree >= 4) return false;
    degree.set(relation.from, fromDegree + 1); degree.set(relation.to, toDegree + 1); return true;
  }).slice(0, 42);
}

function graphPositions(records: GrowthRecord[]) {
  const domains = [...new Set(records.map(primaryDomain))];
  const grouped = new Map<string, GrowthRecord[]>();
  records.forEach((record) => grouped.set(primaryDomain(record), [...(grouped.get(primaryDomain(record)) || []), record]));
  const positions = new Map<string, { x: number; y: number; domain: string }>();
  domains.forEach((domain, domainIndex) => {
    const domainAngle = (Math.PI * 2 * domainIndex) / Math.max(1, domains.length) - Math.PI / 2;
    const centerX = 500 + Math.cos(domainAngle) * (domains.length === 1 ? 0 : 260);
    const centerY = 285 + Math.sin(domainAngle) * (domains.length === 1 ? 0 : 165);
    const items = grouped.get(domain) || [];
    items.forEach((record, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, items.length) + domainAngle;
      const radius = items.length === 1 ? 0 : 42 + Math.min(55, items.length * 4);
      positions.set(record.id, { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius, domain });
    });
  });
  return positions;
}

function relationLabel(kind: RelationKind) {
  return { related: "隐性关联", merge: "建议合并", duplicate: "可能重复", tension: "观点张力" }[kind];
}

export function GrowthOverview({ records, byDay, onOpenRecord }: { records: GrowthRecord[]; byDay: Record<string, DayItem[]>; onOpenRecord: (id: string) => void }) {
  const [range, setRange] = useState(30);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [focusedDomain, setFocusedDomain] = useState("");
  const [focusedNode, setFocusedNode] = useState("");
  const [graphScale, setGraphScale] = useState(1);
  const [confirmedRelations, setConfirmedRelations] = useState<ConfirmedRelation[]>([]);
  const [relationMessage, setRelationMessage] = useState("");
  const [timeAnchor] = useState(() => Date.now());

  useEffect(() => { void fetch("/api/bases").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setSpaces(data.spaces || [])).catch(() => setSpaces([])); }, []);
  useEffect(() => { void fetch("/api/record-relations").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setConfirmedRelations(data.relations || [])).catch(() => setConfirmedRelations([])); }, []);

  const recentRecords = useMemo(() => {
    const since = timeAnchor - range * 86400000;
    return records.filter((record) => new Date(record.createdAt).getTime() >= since);
  }, [range, records, timeAnchor]);
  const focus = useMemo(() => buildFocus(recentRecords), [recentRecords]);
  const shownFocus = focusedDomain ? focus.find((item) => item.name === focusedDomain) || focus[0] : focus[0];
  const graphRecords = useMemo(() => [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 24), [records]);
  const inferredRelations = useMemo(() => buildRelations(graphRecords), [graphRecords]);
  const relations = useMemo(() => {
    const graphIds = new Set(graphRecords.map((record) => record.id));
    const confirmed = confirmedRelations.filter((relation) => graphIds.has(relation.fromRecordId) && graphIds.has(relation.toRecordId)).map((relation): Relation => ({ from: relation.fromRecordId, to: relation.toRecordId, kind: relation.relation, weight: 1, reason: relation.reason, confirmedId: relation.id }));
    const keys = new Set(confirmed.map((relation) => [relation.from, relation.to].sort().join("::")));
    return [...confirmed, ...inferredRelations.filter((relation) => !keys.has([relation.from, relation.to].sort().join("::")))];
  }, [confirmedRelations, graphRecords, inferredRelations]);
  const positions = useMemo(() => graphPositions(graphRecords), [graphRecords]);
  const selectedRecord = graphRecords.find((record) => record.id === focusedNode) || graphRecords[0];
  const selectedRelations = selectedRecord ? relations.filter((relation) => relation.from === selectedRecord.id || relation.to === selectedRecord.id) : [];
  const activeDays = Object.values(byDay).filter((items) => items.length).length;
  const textVolume = records.reduce((sum, record) => sum + compactText(`${record.content}${record.note}${record.summary}`).length, 0);
  const domainCount = spaces.filter((space) => space.kind === "domain").length || new Set(records.map(primaryDomain)).size;
  const stats = [
    { label: "现有记录", value: records.length.toLocaleString("zh-CN"), note: "可追溯的思维证据" },
    { label: "领域基座", value: domainCount.toLocaleString("zh-CN"), note: "正在生长的知识领域" },
    { label: "文字沉淀", value: textVolume >= 10000 ? `${(textVolume / 10000).toFixed(1)} 万` : textVolume.toLocaleString("zh-CN"), note: "原文、札记与摘要" },
    { label: "活跃日", value: activeDays.toLocaleString("zh-CN"), note: "近 60 天留下痕迹" },
  ];
  const maxEvidence = Math.max(1, ...focus.map((item) => item.evidence.length));
  const viewWidth = 1000 / graphScale; const viewHeight = 570 / graphScale;
  const viewBox = `${500 - viewWidth / 2} ${285 - viewHeight / 2} ${viewWidth} ${viewHeight}`;

  async function confirmRelation(relation: Relation) {
    if (relation.confirmedId) return;
    setRelationMessage("正在保存这条双向关系…");
    const response = await fetch("/api/record-relations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromRecordId: relation.from, toRecordId: relation.to, relation: relation.kind, reason: relation.reason }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setRelationMessage(data.error || "保存失败"); return; }
    setConfirmedRelations(data.relations || []); setRelationMessage("关系已写入两条思维记录，可以在记录详情中回看。");
  }

  return <div className="growth-overview">
    <header className="growth-overview-hero">
      <div><span>GROWTH ATLAS · 成长分析</span><h1 className="gothic-display-title">Growth<br />Atlas</h1><p>不评判你“有多强”，只把真实记录、近期关注与潜在连接放在同一张桌面上。</p></div>
      <div className="growth-hero-orbit" aria-hidden="true"><i /><i /><i /><strong>{records.length}</strong><span>THOUGHT<br />TRACES</span></div>
    </header>

    <ActivityHeatmap byDay={byDay} days={60} stats={stats} />

    <section className="focus-panel card">
      <header className="growth-section-head">
        <div><span>RECENT GRAVITY · 近期引力</span><h2>最近，你的注意力落在哪里</h2><p>系统从标题、正文、场景与标签中归纳关注领域；柱高代表该领域拥有的记录证据，而不是能力分数。</p></div>
        <select aria-label="关注范围" value={range} onChange={(event) => setRange(Number(event.target.value))}><option value="3">最近 3 天</option><option value="7">最近 7 天</option><option value="15">最近 15 天</option><option value="30">最近 30 天</option><option value="60">最近 60 天</option></select>
      </header>
      {focus.length ? <div className="focus-workbench">
        <div className="focus-chart" role="img" aria-label={`最近 ${range} 天关注领域证据柱状图`}>
          <div className="focus-y-axis"><span>{maxEvidence}</span><span>{Math.ceil(maxEvidence / 2)}</span><span>0</span></div>
          <div className="focus-bars">
            {focus.map((domain) => <button type="button" key={domain.name} className={shownFocus?.name === domain.name ? "active" : ""} onMouseEnter={() => setFocusedDomain(domain.name)} onFocus={() => setFocusedDomain(domain.name)} onClick={() => setFocusedDomain(domain.name)} aria-label={`${domain.name}，${domain.evidence.length} 条证据`}>
              <span className="focus-count">{domain.evidence.length}<small>条</small></span><i style={{ height: `${Math.max(12, (domain.evidence.length / maxEvidence) * 100)}%` }} /><strong>{domain.name}</strong>
            </button>)}
          </div>
        </div>
        <aside className="evidence-preview" aria-live="polite"><div><span>当前焦点</span><strong>{shownFocus?.name}</strong><small>{shownFocus?.evidence.length || 0} 条可回到原文的证据</small></div><div className="evidence-list">{shownFocus?.evidence.map((item) => <button type="button" key={`${shownFocus.name}-${item.recordId}`} onClick={() => onOpenRecord(item.recordId)}><span>{new Date(item.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</span><strong>{item.title}</strong><p>{item.excerpt}</p><small>{item.basis}{item.source ? ` · 出处：${item.source}` : ""}</small></button>)}</div></aside>
      </div> : <div className="growth-empty"><strong>这段时间还没有足够证据</strong><p>写下一条记录后，关注领域会在这里自然浮现。</p></div>}
    </section>

    <section className="relation-panel card">
      <header className="growth-section-head relation-head">
        <div><span>HIDDEN RELATIONS · 暗线图谱</span><h2>记录并非孤岛</h2><p>图谱用主题、标签与文本相似性寻找隐性关联。它只提出可检查的线索，不替你武断地下结论。</p></div>
        <div className="graph-tools"><button type="button" onClick={() => setGraphScale((value) => Math.max(.8, value - .15))} aria-label="缩小图谱">−</button><span>{Math.round(graphScale * 100)}%</span><button type="button" onClick={() => setGraphScale((value) => Math.min(1.75, value + .15))} aria-label="放大图谱">＋</button></div>
      </header>
      <div className="relation-legend"><span><i className="related" />隐性关联</span><span><i className="merge" />建议合并</span><span><i className="duplicate" />可能重复</span><span><i className="tension" />观点张力</span></div>
      {graphRecords.length ? <div className="relation-workbench">
        <div className="relation-canvas">
          <svg viewBox={viewBox} role="img" aria-label="思维记录关系图谱">
            <g className="relation-edges">{relations.map((relation, index) => { const from = positions.get(relation.from)!; const to = positions.get(relation.to)!; const midX = (from.x + to.x) / 2; const midY = (from.y + to.y) / 2; const dx = to.x - from.x; const dy = to.y - from.y; const length = Math.max(1, Math.hypot(dx, dy)); const curve = ((index % 5) - 2) * 9; const controlX = midX - (dy / length) * curve; const controlY = midY + (dx / length) * curve; const selected = selectedRecord && (relation.from === selectedRecord.id || relation.to === selectedRecord.id); return <g key={`${relation.from}-${relation.to}`} className={`${relation.kind} ${relation.confirmedId ? "confirmed" : ""} ${selected ? "selected" : ""}`}><path d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`} /><circle cx={midX} cy={midY} r={relation.confirmedId ? 4 : 2.5} /><text x={midX} y={midY - 8} textAnchor="middle">{relation.confirmedId ? `已确认 · ${relationLabel(relation.kind)}` : relationLabel(relation.kind)}</text></g>; })}</g>
            <g className="relation-nodes">{graphRecords.map((record) => { const position = positions.get(record.id)!; const active = selectedRecord?.id === record.id; const radius = 9 + Math.min(8, record.importance || 3); return <g key={record.id} role="button" tabIndex={0} aria-label={`${record.title}，${position.domain}`} className={active ? "active" : ""} onMouseEnter={() => setFocusedNode(record.id)} onFocus={() => setFocusedNode(record.id)} onClick={() => setFocusedNode(record.id)} onKeyDown={(event) => { if (event.key === "Enter") setFocusedNode(record.id); }}><circle cx={position.x} cy={position.y} r={radius + (active ? 7 : 0)} className="node-halo" /><circle cx={position.x} cy={position.y} r={radius} /><text x={position.x} y={position.y + radius + 17} textAnchor="middle">{record.title.slice(0, 9)}{record.title.length > 9 ? "…" : ""}</text></g>; })}</g>
          </svg>
        </div>
        <aside className="relation-inspector" aria-live="polite">{selectedRecord && <><span>{primaryDomain(selectedRecord)}</span><h3>{selectedRecord.title || "未命名记录"}</h3><p>{excerpt(selectedRecord.summary || selectedRecord.content, 130)}</p><div className="relation-suggestions">{selectedRelations.length ? selectedRelations.sort((a, b) => b.weight - a.weight).map((relation) => { const otherId = relation.from === selectedRecord.id ? relation.to : relation.from; const other = graphRecords.find((record) => record.id === otherId)!; return <article key={`${relation.from}-${relation.to}`}><button type="button" className="relation-jump" onClick={() => setFocusedNode(otherId)}><i className={relation.kind}>{relationLabel(relation.kind)}</i><strong>{other.title}</strong><p>{relation.reason}</p></button><button type="button" className={`confirm-relation ${relation.confirmedId ? "confirmed" : ""}`} disabled={Boolean(relation.confirmedId)} onClick={() => void confirmRelation(relation)}>{relation.confirmedId ? "✓ 已写入记录" : "确认这条关系"}</button></article>; }) : <div className="relation-none">暂未发现强关联。它可能是一条真正的新枝，也可能需要更多上下文。</div>}</div>{relationMessage && <small className="relation-message">{relationMessage}</small>}<button type="button" className="open-record-link" onClick={() => onOpenRecord(selectedRecord.id)}>打开这条记录 →</button></>}</aside>
      </div> : <div className="growth-empty"><strong>图谱等待第一颗节点</strong><p>保存思维记录后，关系会逐步显现。</p></div>}
      <footer className="relation-note">颜色和线型分别表达隐性关联、建议合并、可能重复与观点张力；只有点击“确认这条关系”后，关系才会写入两条记录。</footer>
    </section>
  </div>;
}
