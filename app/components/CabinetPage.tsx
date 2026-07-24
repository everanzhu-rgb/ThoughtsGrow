"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";

type CabinetItem = { id: string; kind: string; title: string; content: string; source: string; imageUrl: string; note: string; createdAt: string; favoriteId?: string };

export function CabinetPage() {
  const [items, setItems] = useState<CabinetItem[]>([]); const [kind, setKind] = useState<"quote" | "image">("quote"); const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [source, setSource] = useState(""); const [note, setNote] = useState(""); const [imageUrl, setImageUrl] = useState(""); const [busy, setBusy] = useState(false); const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { fetch("/api/cabinet").then((response) => response.ok ? response.json() : null).then((data) => { if (data) setItems(data.items || []); }).catch(() => undefined); }, []);
  async function uploadImage(file: File) { setBusy(true); try { const form = new FormData(); form.append("file", file); form.append("extractedText", ""); const response = await fetch("/api/materials", { method: "POST", body: form }); const data = await response.json(); if (response.ok && data.material) setImageUrl(`/api/materials/file?id=${encodeURIComponent(data.material.id)}`); } finally { setBusy(false); } }
  async function save() { setBusy(true); try { const response = await fetch("/api/cabinet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, title, content, source, note, imageUrl }) }); if (response.ok) { const data = await response.json(); setItems((old) => [data.item, ...old]); setTitle(""); setContent(""); setSource(""); setNote(""); setImageUrl(""); } } finally { setBusy(false); } }
  async function remove(item: CabinetItem) { const response = await fetch("/api/cabinet", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, favoriteId: item.favoriteId }) }); if (response.ok) setItems((old) => old.filter((entry) => entry.id !== item.id)); }
  return <div className="cabinet-page">
    <header className="cabinet-hero"><span>THE CABINET OF FOUND LIGHT</span><h1>拾光橱</h1><p>把偶然击中你的句子与图像陈列起来。它们不必立即成为方法，也可以只是值得反复凝视的光。</p><button onClick={() => document.getElementById("cabinet-compose")?.scrollIntoView({ behavior: "smooth" })}>放入一件新收藏 ↓</button></header>
    <section className="cabinet-room" aria-label="收藏展示橱">
      <div className="cabinet-glow" aria-hidden="true" />
      {items.length ? items.map((item, index) => <article className={`cabinet-object kind-${item.kind}`} key={item.id} style={{ "--delay": `${(index % 8) * 70}ms` } as React.CSSProperties}>
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title || "收藏图片"} /> : <blockquote>“{item.content}”</blockquote>}
        <div><small>{item.kind === "image" ? "IMAGE" : "WORDS"} · {new Date(item.createdAt).toLocaleDateString("zh-CN")}</small><strong>{item.title || "无题收藏"}</strong>{item.note && <p>{item.note}</p>}<span>{item.source}</span><button title="移出收藏橱" onClick={() => void remove(item)}>×</button></div>
      </article>) : <div className="cabinet-empty">橱窗还空着。Home 页收藏的漂流句会自动来到这里。</div>}
    </section>
    <section className="cabinet-compose card" id="cabinet-compose"><div><span className="eyebrow">NEW OBJECT</span><h2>放入一件值得留住的事物</h2><p>短句会成为一张文字藏品，图片会以带光框的方式陈列。</p></div><div className="cabinet-kind"><button className={kind === "quote" ? "active" : ""} onClick={() => setKind("quote")}>一句话</button><button className={kind === "image" ? "active" : ""} onClick={() => setKind("image")}>一幅图</button></div><label>名称<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="给它一个名字" /></label>{kind === "quote" ? <label>内容<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="写下想收藏的句子…" /></label> : <div className="cabinet-image-pick"><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />{imageUrl ? <img src={imageUrl} alt="即将收藏" /> : <button onClick={() => inputRef.current?.click()}>＋ 选择图片</button>}</div>}<div className="cabinet-form-row"><label>出处<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="作者、作品或链接" /></label><label>私语<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="它为何值得留下" /></label></div><button className="primary-button" disabled={busy || (!content.trim() && !imageUrl)} onClick={() => void save()}>{busy ? "正在安放…" : "放入收藏橱"}</button></section>
  </div>;
}
