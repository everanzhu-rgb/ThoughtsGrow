"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";

type MapNode = { id: string; title: string; subtitle: string; detail: string; x: number; y: number; kind: "root" | "group" | "leaf" | "pending"; parent?: string };
type Note = { id: string; nodeId: string; title: string; content: string; updatedAt: string };
type Position = { x: number; y: number };

const elementNames = ["目的", "问题", "信息", "解释与推理", "概念", "假设", "结果与意义", "观点"];
const standardNames = ["清晰性", "准确性", "精确性", "相关性", "深度", "广度", "逻辑性", "重要性", "公正性"];
const capabilityNames = ["批判性思维", "逻辑推理", "问题分析", "决策能力", "反思能力"];
function describe(name: string) {
  const details: Record<string, string> = { 目的: "辨认一次思考真正想达成的结果，并检查局部目标是否服从更大的目标。", 问题: "把模糊困惑转化为可以回答、比较或验证的核心问题。", 信息: "区分事实、经验、推测和待验证信息，并追问来源质量。", "解释与推理": "检查证据如何通向结论，识别跳跃、矛盾和替代解释。", 概念: "澄清关键词的定义、边界与使用情境。", 假设: "找出结论成立所依赖、但没有明说的前提。", "结果与意义": "推演判断在短期、长期以及不同相关者中的后果。", 观点: "主动切换立场，寻找最强反方和被遗漏的经验。" };
  return details[name] || `“${name}”是当前体系的一项观察维度。它只有在文本存在充分证据时才参与判断。`;
}

function createBaseNodes(): MapNode[] {
  const root: MapNode = { id: "base", title: "万象思维基座", subtitle: "Critical Thinking Base V1.0", detail: "用思维元素还原结构，用思维标准检验质量，并把长期证据汇聚为可解释的能力画像。", x: 800, y: 520, kind: "root" };
  const groups: MapNode[] = [
    { id: "elements", title: "思维元素", subtitle: "怎样思考", detail: "8 个元素描述一次思考由什么构成。", x: 330, y: 300, kind: "group", parent: "base" },
    { id: "standards", title: "思维标准", subtitle: "完成得怎样", detail: "9 项标准检验相关思维环节的质量。", x: 1270, y: 300, kind: "group", parent: "base" },
    { id: "capabilities", title: "综合能力", subtitle: "形成什么画像", detail: "能力来自多次、跨情境的证据组合，而不是一次分数。", x: 850, y: 900, kind: "group", parent: "base" },
    { id: "pending", title: "候选与补丁", subtitle: "尚未改变主干", detail: "新材料先暂存、对照和共创；小变化成为补丁，大变化才形成版本。", x: 250, y: 900, kind: "pending", parent: "base" },
  ];
  const elementPositions = [[80,80],[300,70],[75,185],[310,190],[65,300],[320,310],[65,420],[320,430]];
  const standardPositions = [[1080,70],[1300,70],[1515,80],[1060,180],[1285,190],[1515,195],[1060,300],[1285,310],[1515,315]];
  const capabilityPositions = [[430,1030],[645,1050],[860,1040],[1075,1050],[1290,1030]];
  const leaves: MapNode[] = [
    ...elementNames.map((name, index) => ({ id: `element-${name}`, title: name, subtitle: `元素 ${index + 1}`, detail: describe(name), x: elementPositions[index][0], y: elementPositions[index][1], kind: "leaf" as const, parent: "elements" })),
    ...standardNames.map((name, index) => ({ id: `standard-${name}`, title: name, subtitle: `标准 ${index + 1}`, detail: describe(name), x: standardPositions[index][0], y: standardPositions[index][1], kind: "leaf" as const, parent: "standards" })),
    ...capabilityNames.map((name, index) => ({ id: `capability-${name}`, title: name, subtitle: "长期证据", detail: describe(name), x: capabilityPositions[index][0], y: capabilityPositions[index][1], kind: "leaf" as const, parent: "capabilities" })),
  ];
  return [root, ...groups, ...leaves];
}

export function FrameworkMindMap({ onEdit }: { onEdit(label: string): void }) {
  const baseNodes = useMemo(() => createBaseNodes(), []); const [positions, setPositions] = useState<Record<string, Position>>({});
  const nodes = useMemo(() => baseNodes.map((node) => ({ ...node, ...(positions[node.id] || {}) })), [baseNodes, positions]);
  const [scale, setScale] = useState(0.72); const [offset, setOffset] = useState({ x: 0, y: 0 }); const [selectedId, setSelectedId] = useState("base");
  const [notes, setNotes] = useState<Note[]>([]); const [draft, setDraft] = useState(""); const [saving, setSaving] = useState(false); const [layoutState, setLayoutState] = useState(""); const [fullscreen, setFullscreen] = useState(false);
  const pan = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null); const nodeDrag = useRef<{ id: string; x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const selected = nodes.find((node) => node.id === selectedId) || nodes[0]; const selectedNotes = notes.filter((note) => note.nodeId === selected.id);

  useEffect(() => {
    Promise.all([fetch("/api/framework-notes").then((r) => r.ok ? r.json() : null), fetch("/api/framework-layout").then((r) => r.ok ? r.json() : null)]).then(([noteData, layoutData]) => {
      setNotes(noteData?.notes ?? []); const saved: Record<string, Position> = {}; for (const item of layoutData?.positions ?? []) saved[item.nodeId] = { x: item.x, y: item.y }; setPositions(saved);
    }).catch(() => undefined);
  }, []);
  useEffect(() => { const close = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setFullscreen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);

  function zoomTo(next: number) { setScale(Math.max(0.42, Math.min(1.65, next))); }
  function wheel(event: WheelEvent<HTMLDivElement>) { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); zoomTo(scale - event.deltaY * 0.001); }
  function startPan(event: PointerEvent<HTMLDivElement>) { if ((event.target as HTMLElement).closest("button")) return; pan.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }; event.currentTarget.setPointerCapture(event.pointerId); }
  function movePan(event: PointerEvent<HTMLDivElement>) { if (pan.current) setOffset({ x: pan.current.ox + event.clientX - pan.current.x, y: pan.current.oy + event.clientY - pan.current.y }); }
  function endPan() { pan.current = null; }
  function startNodeDrag(event: PointerEvent<HTMLButtonElement>, node: MapNode) { event.stopPropagation(); nodeDrag.current = { id: node.id, x: event.clientX, y: event.clientY, ox: node.x, oy: node.y, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }
  function moveNode(event: PointerEvent<HTMLButtonElement>) { const drag = nodeDrag.current; if (!drag) return; const dx = (event.clientX - drag.x) / scale; const dy = (event.clientY - drag.y) / scale; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; setPositions((items) => ({ ...items, [drag.id]: { x: drag.ox + dx, y: drag.oy + dy } })); setLayoutState("布局有未保存的变化"); }
  function endNode(node: MapNode) { const moved = nodeDrag.current?.moved; nodeDrag.current = null; if (!moved) setSelectedId(node.id); }

  async function saveLayout() {
    setLayoutState("正在保存…"); const payload = nodes.map((node) => ({ nodeId: node.id, x: node.x, y: node.y }));
    const response = await fetch("/api/framework-layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positions: payload }) }); setLayoutState(response.ok ? "布局已保存" : "保存失败，请稍后重试");
  }
  async function resetLayout() { await fetch("/api/framework-layout", { method: "DELETE" }); setPositions({}); setScale(0.72); setOffset({ x: 0, y: 0 }); setLayoutState("已恢复默认布局"); }
  async function saveNote() { if (!draft.trim()) return; setSaving(true); try { const response = await fetch("/api/framework-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodeId: selected.id, title: selected.title, content: draft }) }); const data = await response.json(); if (response.ok && data.note) { setNotes((items) => [data.note, ...items]); setDraft(""); } } finally { setSaving(false); } }

  return <section className={`framework-map-section card ${fullscreen ? "is-fullscreen" : ""}`}>
    <div className="framework-map-head"><div><span className="eyebrow">SYSTEM ATLAS · 可交互全景</span><h2>把整座思维基座摊开来看</h2><p>拖动节点重新编排，拖动空白移动画布；按住 Ctrl/⌘ + 滚轮缩放。进入全屏后可获得更完整的操作空间。</p></div><div className="map-controls"><button onClick={() => zoomTo(scale - 0.12)}>−</button><span>{Math.round(scale * 100)}%</span><button onClick={() => zoomTo(scale + 0.12)}>＋</button><button onClick={() => { setScale(fullscreen ? 0.85 : 0.72); setOffset({ x: 0, y: 0 }); }}>归中</button><button onClick={() => setFullscreen((value) => !value)}>{fullscreen ? "退出全屏" : "全屏展开"}</button><button className="save-layout" onClick={() => void saveLayout()}>保存布局</button></div></div>
    {layoutState && <p className="map-layout-state">{layoutState}<button onClick={() => void resetLayout()}>恢复默认</button></p>}
    <div className={`framework-map-shell detail-${scale < 0.68 ? "low" : scale > 1.08 ? "high" : "mid"}`}>
      <div className="framework-map-viewport" onWheel={wheel} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}>
        <div className="framework-map-canvas" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
          {nodes.filter((node) => node.parent).map((node) => { const parent = nodes.find((item) => item.id === node.parent)!; const dx = node.x - parent.x; const dy = node.y - parent.y; return <i className={`map-link link-${node.kind}`} key={`link-${node.id}`} style={{ left: parent.x, top: parent.y, width: Math.hypot(dx, dy), transform: `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)` }} />; })}
          {nodes.map((node) => <button key={node.id} className={`map-node node-${node.kind} ${selected.id === node.id ? "active" : ""}`} style={{ left: node.x, top: node.y }} onPointerDown={(event) => startNodeDrag(event, node)} onPointerMove={moveNode} onPointerUp={() => endNode(node)} onPointerCancel={() => { nodeDrag.current = null; }}><small>{node.subtitle}</small><strong>{node.title}</strong><span>{node.detail}</span>{notes.some((note) => note.nodeId === node.id) && <i>{notes.filter((note) => note.nodeId === node.id).length} 条札记</i>}</button>)}
        </div>
      </div>
      <aside className="map-inspector"><span className="eyebrow">NODE / {selected.kind}</span><h3>{selected.title}</h3><p>{selected.detail}</p><div className="map-inspector-actions"><button className="ghost-button compact" onClick={() => onEdit(selected.title)}>编辑此模块</button></div><div className="node-note-compose"><label>留下一枚思想便笺<textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="它与什么经验有关？还有什么定义或反例需要补上？" /></label><button disabled={saving || !draft.trim()} onClick={saveNote}>{saving ? "保存中…" : "暂存想法"}</button></div>{selectedNotes.length > 0 && <div className="node-notes"><small>已暂存</small>{selectedNotes.slice(0, 3).map((note) => <article key={note.id}><p>{note.content}</p><span>{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span></article>)}</div>}</aside>
    </div>
  </section>;
}
