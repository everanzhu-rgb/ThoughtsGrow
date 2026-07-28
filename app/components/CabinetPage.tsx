"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";

type CabinetItem = {
  id: string;
  kind: string;
  title: string;
  content: string;
  source: string;
  imageUrl: string;
  note: string;
  createdAt: string;
  favoriteId?: string;
};

type ApiPayload = {
  error?: string;
  requestId?: string;
  stage?: string;
  item?: CabinetItem;
  material?: { id: string };
};

const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

async function responsePayload(response: Response) {
  return (await response.json().catch(() => ({}))) as ApiPayload;
}

export function CabinetPage() {
  const [items, setItems] = useState<CabinetItem[]>([]);
  const [kind, setKind] = useState<"quote" | "image">("quote");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "success" | "error">("info");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/cabinet")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "读取收藏失败");
        setItems(data.items || []);
      })
      .catch((error) => {
        setMessageKind("error");
        setMessage(error instanceof Error ? error.message : "读取收藏失败，请刷新页面重试。");
      });
  }, []);

  async function uploadImage(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setMessageKind("error");
      setMessage("请选择 JPG、PNG、GIF 或 WebP 图片。");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setMessageKind("error");
      setMessage("图片不能超过 20 MB。");
      return;
    }

    setBusy(true);
    setMessageKind("info");
    setMessage("正在上传图片…");
    try {
      const response = await fetch("/api/cabinet/image", {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "X-File-Name": encodeURIComponent(file.name),
          "X-File-Size": String(file.size),
        },
        body: file,
      });
      const data = await responsePayload(response);
      if (!response.ok || !data.material?.id) {
        const requestId = data.requestId || response.headers.get("x-request-id");
        const fallback = `图片上传失败（HTTP ${response.status || "网络错误"}）`;
        throw new Error(`${data.error || fallback}${requestId ? `；请求编号：${requestId}` : ""}`);
      }
      setImageUrl(`/api/materials/file?id=${encodeURIComponent(data.material.id)}`);
      setMessageKind("success");
      setMessage("图片已上传。填写信息后，点击“放入收藏橱”完成保存。");
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "图片上传失败，请稍后重试。");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function save() {
    setBusy(true);
    setMessageKind("info");
    setMessage("正在保存收藏…");
    try {
      const response = await fetch("/api/cabinet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, content, source, note, imageUrl }),
      });
      const data = await responsePayload(response);
      if (!response.ok || !data.item) throw new Error(data.error || "保存失败，请稍后重试。");
      setItems((old) => [data.item!, ...old]);
      setTitle("");
      setContent("");
      setSource("");
      setNote("");
      setImageUrl("");
      setMessageKind("success");
      setMessage("已放入收藏橱。");
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CabinetItem) {
    try {
      const response = await fetch("/api/cabinet", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, favoriteId: item.favoriteId }),
      });
      const data = await responsePayload(response);
      if (!response.ok) throw new Error(data.error || "移除失败，请稍后重试。");
      setItems((old) => old.filter((entry) => entry.id !== item.id));
      setMessageKind("success");
      setMessage("已移出收藏橱。");
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "移除失败，请稍后重试。");
    }
  }

  return <div className="cabinet-page">
    <header className="cabinet-hero"><span>THE CABINET OF FOUND LIGHT · 拾光橱 · 我的收藏</span><h1 className="gothic-display-title">Cabinet<br /><span>of Light</span></h1><p>把偶然击中你的句子与图像陈列起来。它们不必立即成为方法，也可以只是值得反复凝视的光。</p><button type="button" onClick={() => document.getElementById("cabinet-compose")?.scrollIntoView({ behavior: "smooth" })}>放入一件新收藏 ↓</button></header>
    <section className="cabinet-room" aria-label="收藏展示橱">
      <div className="cabinet-glow" aria-hidden="true" />
      {items.length ? items.map((item, index) => <article className={`cabinet-object kind-${item.kind}`} key={item.id} style={{ "--delay": `${(index % 8) * 70}ms` } as React.CSSProperties}>
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title || "收藏图片"} /> : <blockquote>“{item.content}”</blockquote>}
        <div><small>{item.kind === "image" ? "IMAGE" : "WORDS"} · {new Date(item.createdAt).toLocaleDateString("zh-CN")}</small><strong>{item.title || "无题收藏"}</strong>{item.note && <p>{item.note}</p>}<span>{item.source}</span><button type="button" title="移出收藏橱" onClick={() => void remove(item)}>×</button></div>
      </article>) : <div className="cabinet-empty">橱窗还空着。Home 页收藏的漂流句会自动来到这里。</div>}
    </section>
    <section className="cabinet-compose card" id="cabinet-compose">
      <div><span className="eyebrow">NEW OBJECT</span><h2>放入一件值得留住的事物</h2><p>短句会成为一张文字藏品，图片会以带光框的方式陈列。</p></div>
      <div className="cabinet-kind"><button type="button" className={kind === "quote" ? "active" : ""} onClick={() => { setKind("quote"); setMessage(""); }}>一句话</button><button type="button" className={kind === "image" ? "active" : ""} onClick={() => { setKind("image"); setMessage(""); }}>一幅图</button></div>
      <label>名称<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="给它一个名字" /></label>
      {kind === "quote" ? <label>内容<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="写下想收藏的句子…" /></label> : <div className="cabinet-image-pick">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-label="选择收藏图片" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
        {imageUrl ? <><img src={imageUrl} alt="即将收藏" onError={() => { setMessageKind("error"); setMessage("图片已上传，但预览读取失败。请重新选择图片。"); }} /><button type="button" onClick={() => { setImageUrl(""); setMessage(""); }}>重新选择</button></> : <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "正在上传…" : "＋ 选择图片"}</button>}
      </div>}
      <div className="cabinet-form-row"><label>出处<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="作者、作品或链接" /></label><label>私语<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="它为何值得留下" /></label></div>
      {message && <p className={`cabinet-feedback ${messageKind}`} role={messageKind === "error" ? "alert" : "status"} aria-live="polite">{message}</p>}
      <button type="button" className="primary-button" disabled={busy || (!content.trim() && !imageUrl)} onClick={() => void save()}>{busy ? "正在安放…" : "放入收藏橱"}</button>
    </section>
  </div>;
}
