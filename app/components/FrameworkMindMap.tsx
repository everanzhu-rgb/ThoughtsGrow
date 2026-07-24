"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";

type MapNode = { id: string; title: string; subtitle: string; detail: string; x: number; y: number; kind: "root" | "group" | "leaf" | "pending"; parent?: string };
type Note = { id: string; nodeId: string; title: string; content: string; updatedAt: string };

const root = { id: "base", title: "万象思维基座", subtitle: "Critical Thinking Base V1.0", detail: "用思维元素还原结构，用思维标准检验质量，并把长期证据汇聚为可解释的能力画像。", x: 600, y: 360, kind: "root" as const };
const elementNames = ["目的", "问题", "信息", "解释与推理", "概念", "假设", "结果与意义", "观点"];
const standardNames = ["清晰性", "准确性", "精确性", "相关性", "深度", "广度", "逻辑性", "重要性", "公正性"];
const capabilityNames = ["批判性思维", "逻辑推理", "问题分析", "决策能力", "反思能力"];

function describe(name: string) {
  const details: Record<string, string> = {
    目的: "辨认一次思考真正想达成的结果，并检查局部目标是否服从更大的目标。", 问题: "把模糊困惑转化为可以回答、比较或验证的核心问题。", 信息: "区分事实、经验、推测和待验证信息，并追问来源质量。", "解释与推理": "检查证据如何通向结论，识别跳跃、矛盾和替代解释。", 概念: "澄清关键词的定义、边界与使用情境。", 假设: "找出结论成立所依赖、但没有明说的前提。", "结果与意义": "推演判断在短期、长期以及不同相关者中的后果。", 观点: "主动切换立场，寻找最强反方和被遗漏的经验。",
  };
  return details[name] || `“${name}”是当前体系的一项观察维度。它只有在文本存在充分证据时才参与判断。`;
}

export function FrameworkMindMap({ onEdit }: { onEdit(label: string): void }) {
  const [scale, setScale] = useState(0.9);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState("base");
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const nodes = useMemo<MapNode[]>(() => {
    const groups: MapNode[] = [
      { id: "elements", title: "思维元素", subtitle: "怎样思考", detail: "8 个元素描述一次思考由什么构成。", x: 260, y: 190, kind: "group", parent: "base" },
      { id: "standards", title: "思维标准", subtitle: "完成得怎样", detail: "9 项标准检验相关思维环节的质量。", x: 940, y: 190, kind: "group", parent: "base" },
      { id: "capabilities", title: "综合能力", subtitle: "形成什么画像", detail: "能力来自多次、跨情境的证据组合，而不是一次分数。", x: 600, y: 650, kind: "group", parent: "base" },
      { id: "pending", title: "候选与补丁", subtitle: "尚未改变主干", detail: "新材料先暂存、对照和共创；小变化成为补丁，大变化才形成版本。", x: 220, y: 620, kind: "pending", parent: "base" },
    ];
    const leaves: MapNode[] = [
      ...elementNames.map((name, index) => ({ id: `element-${name}`, title: name, subtitle: `元素 ${index + 1}`, detail: describe(name), x: 75 + (index % 2) * 190, y: 38 + Math.floor(index / 2) * 105, kind: "leaf" as const, parent: "elements" })),
      ...standardNames.map((name, index) => ({ id: `standard-${name}`, title: name, subtitle: `标准 ${index + 1}`, detail: describe(name), x: 965 + (index % 2) * 170, y: 20 + Math.floor(index / 2) * 90, kind: "leaf" as const, parent: "standards" })),
      ...capabilityNames.map((name, index) => ({ id: `capability-${name}`, title: name, subtitle: "长期证据", detail: describe(name), x: 380 + index * 115, y: 740, kind: "leaf" as const, parent: "capabilities" })),
    ];
    return [root, ...groups, ...leaves];
  }, []);

  const selected = nodes.find((node) => node.id === selectedId) || root;
  const selectedNotes = notes.filter((note) => note.nodeId === selected.id);

  useEffect(() => {
    fetch("/api/framework-notes").then((response) => response.ok ? response.json() : null).then((data) => setNotes(data?.notes ?? [])).catch(() => undefined);
  }, []);

  function zoomTo(next: number) { setScale(Math.max(0.55, Math.min(1.55, next))); }
  function wheel(event: WheelEvent<HTMLDivElement>) { event.preventDefault(); zoomTo(scale - event.deltaY * 0.001); }
  function startPan(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function movePan(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + event.clientX - drag.current.x, y: drag.current.oy + event.clientY - drag.current.y });
  }
  function endPan() { drag.current = null; }

  async function saveNote() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/framework-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodeId: selected.id, title: selected.title, content: draft }) });
      const data = await response.json();
      if (response.ok && data.note) { setNotes((items) => [data.note, ...items]); setDraft(""); }
    } finally { setSaving(false); }
  }

  return (
    <section className="framework-map-section card">
      <div className="framework-map-head"><div><span className="eyebrow">SYSTEM ATLAS · 可交互全景</span><h2>把整座思维基座摊开来看</h2><p>滚轮缩放、拖动画布；越靠近，信息越具体。点击任意节点可查看定义、编辑体系或留下札记。</p></div><div className="map-controls"><button onClick={() => zoomTo(scale - 0.15)}>−</button><span>{Math.round(scale * 100)}%</span><button onClick={() => zoomTo(scale + 0.15)}>＋</button><button onClick={() => { setScale(0.9); setOffset({ x: 0, y: 0 }); }}>归中</button></div></div>
      <div className={`framework-map-shell detail-${scale < 0.78 ? "low" : scale > 1.12 ? "high" : "mid"}`}>
        <div className="framework-map-viewport" onWheel={wheel} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}>
          <div className="framework-map-canvas" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
            {nodes.filter((node) => node.parent).map((node) => {
              const parent = nodes.find((item) => item.id === node.parent)!;
              const dx = node.x - parent.x; const dy = node.y - parent.y; const length = Math.hypot(dx, dy); const angle = Math.atan2(dy, dx) * 180 / Math.PI;
              return <i className={`map-link link-${node.kind}`} key={`link-${node.id}`} style={{ left: parent.x, top: parent.y, width: length, transform: `rotate(${angle}deg)` }} />;
            })}
            {nodes.map((node) => <button key={node.id} className={`map-node node-${node.kind} ${selected.id === node.id ? "active" : ""}`} style={{ left: node.x, top: node.y }} onClick={() => setSelectedId(node.id)}><small>{node.subtitle}</small><strong>{node.title}</strong><span>{node.detail}</span>{notes.some((note) => note.nodeId === node.id) && <i>{notes.filter((note) => note.nodeId === node.id).length} 条札记</i>}</button>)}
          </div>
        </div>
        <aside className="map-inspector"><span className="eyebrow">NODE / {selected.kind}</span><h3>{selected.title}</h3><p>{selected.detail}</p><div className="map-inspector-actions"><button className="ghost-button compact" onClick={() => onEdit(selected.title)}>编辑此模块</button></div><div className="node-note-compose"><label>留下一枚思想便笺<textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="它与什么经验有关？还有什么定义或反例需要补上？" /></label><button disabled={saving || !draft.trim()} onClick={saveNote}>{saving ? "保存中…" : "暂存想法"}</button></div>{selectedNotes.length > 0 && <div className="node-notes"><small>已暂存</small>{selectedNotes.slice(0, 3).map((note) => <article key={note.id}><p>{note.content}</p><span>{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span></article>)}</div>}</aside>
      </div>
    </section>
  );
}
