"use client";

import { useEffect, useState } from "react";

type RecordRef = { id: string; title: string; summary?: string; source?: string };
type SavedRelation = { id: string; fromRecordId: string; toRecordId: string; relation: string; reason: string; createdAt: string; fromRecord?: RecordRef; toRecord?: RecordRef };
const labels: Record<string, string> = { related: "隐性关联", merge: "适合合并", duplicate: "内容重复", tension: "观点张力" };

export function RecordRelations({ recordId, onOpenRecord }: { recordId: string; onOpenRecord(id: string): void }) {
  const [relations, setRelations] = useState<SavedRelation[]>([]); const [message, setMessage] = useState("");
  async function load() { const response = await fetch(`/api/record-relations?recordId=${encodeURIComponent(recordId)}`); const data = await response.json().catch(() => ({})); if (response.ok) setRelations(data.relations || []); }
  useEffect(() => { void fetch(`/api/record-relations?recordId=${encodeURIComponent(recordId)}`).then((response) => response.ok ? response.json() : null).then((data) => setRelations(data?.relations || [])).catch(() => setRelations([])); }, [recordId]);
  async function remove(id: string) { const response = await fetch("/api/record-relations", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (response.ok) { await load(); setMessage("这条确认关系已移除，原始记录未受影响。"); } }
  return <section className="card record-relations-card"><header><div><span className="eyebrow">CONFIRMED CONNECTIONS</span><h2>与其他记录的关系</h2><p>这里只保存你亲自确认过的关系。系统推测仍留在生长谱中，不会自动进入档案。</p></div><strong>{relations.length}</strong></header>{relations.length ? <div className="record-relations-list">{relations.map((relation) => { const other = relation.fromRecordId === recordId ? relation.toRecord : relation.fromRecord; return <article key={relation.id}><button onClick={() => other && onOpenRecord(other.id)}><i className={relation.relation}>{labels[relation.relation] || "相关"}</i><strong>{other?.title || "记录已不存在"}</strong><p>{relation.reason}</p><small>{other?.source ? `出处：${other.source} · ` : ""}确认于 {new Date(relation.createdAt).toLocaleString("zh-CN")}</small></button><button className="quiet-action quiet-danger" aria-label={`删除与 ${other?.title} 的关系`} onClick={() => void remove(relation.id)}>移除</button></article>; })}</div> : <div className="record-relations-empty"><span>∞</span><p>尚无已确认关系。前往“生长谱”的关系图谱，查看系统发现的潜在线索。</p></div>}{message && <small className="record-relations-message">{message}</small>}</section>;
}
