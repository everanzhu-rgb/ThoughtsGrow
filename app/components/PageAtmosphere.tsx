"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";

const DEFAULT_ART: Record<string, string> = {
  framework: "/visuals/xuli-framework-portrait.png",
  analyze: "/visuals/xuli-analyze-portrait.png",
  history: "/visuals/xuli-history-portrait.png",
  records: "/visuals/xuli-records-portrait.png",
  growth: "/visuals/xuli-growth-portrait.png",
  topics: "/visuals/xuli-topics-portrait.png",
  cabinet: "/visuals/xuli-cabinet-portrait.png",
  new: "/visuals/xuli-new-portrait.png",
  trash: "/visuals/xuli-trash-portrait.png",
  knowledge: "/visuals/xuli-records-portrait.png",
  integration: "/visuals/xuli-framework-portrait.png",
};

const DB_NAME = "xuli-visuals";
const STORE_NAME = "page-backgrounds";

function openVisualDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCustomArt(page: string) {
  const database = await openVisualDatabase();
  return new Promise<string | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(page);
    request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : undefined);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

async function writeCustomArt(page: string, image?: string) {
  const database = await openVisualDatabase();
  return new Promise<void>((resolve, reject) => {
    const store = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    const request = image ? store.put(image, page) : store.delete(page);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

async function prepareImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("无法读取这张图片"));
      image.src = objectUrl;
    });
    const scale = Math.min(1, 2200 / source.naturalWidth, 1400 / source.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法处理这张图片");
    context.fillStyle = "#080809";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function PageAtmosphere({ page, title }: { page: string; title: string }) {
  const defaultArt = DEFAULT_ART[page] ?? DEFAULT_ART.framework;
  const [image, setImage] = useState(defaultArt);
  const [custom, setCustom] = useState(false);
  const [status, setStatus] = useState("");
  const layerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rawPointer = useRef({ x: -999, y: -999 });
  const smoothPointer = useRef({ x: -999, y: -999 });

  useEffect(() => {
    let cancelled = false;
    readCustomArt(page).then((stored) => {
      if (!cancelled && stored) {
        setImage(stored);
        setCustom(true);
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [page]);

  useEffect(() => {
    let frame = 0;
    const track = (event: globalThis.PointerEvent) => {
      const layer = layerRef.current;
      if (!layer) return;
      const bounds = layer.getBoundingClientRect();
      rawPointer.current = event.clientX >= bounds.left && event.clientY >= bounds.top
        ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
        : { x: -999, y: -999 };
    };
    const animate = () => {
      smoothPointer.current.x += (rawPointer.current.x - smoothPointer.current.x) * 0.1;
      smoothPointer.current.y += (rawPointer.current.y - smoothPointer.current.y) * 0.1;
      layerRef.current?.style.setProperty("--page-spot-x", `${smoothPointer.current.x}px`);
      layerRef.current?.style.setProperty("--page-spot-y", `${smoothPointer.current.y}px`);
      frame = window.requestAnimationFrame(animate);
    };
    window.addEventListener("pointermove", track, { passive: true });
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("pointermove", track);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("请选择 JPG、PNG 或 WebP 图片");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setStatus("图片请控制在 15 MB 以内");
      return;
    }
    setStatus("正在整理光影与尺寸…");
    try {
      const prepared = await prepareImage(file);
      setImage(prepared);
      setCustom(true);
      try {
        await writeCustomArt(page, prepared);
        setStatus(`已保存为「${title}」的专属背景`);
      } catch {
        setStatus("图片已应用；浏览器未能永久保存它");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "图片处理失败，请换一张试试");
    } finally {
      event.target.value = "";
    }
  }

  async function reset() {
    await writeCustomArt(page).catch(() => undefined);
    setImage(defaultArt);
    setCustom(false);
    setStatus("已恢复默认雕塑背景");
  }

  const style = { "--page-atmosphere-image": `url("${image}")` } as CSSProperties;

  return <>
    <div ref={layerRef} className="page-atmosphere" style={style} aria-hidden="true">
      <div className="page-atmosphere-base" />
      <div className="page-atmosphere-reveal" />
      <div className="page-atmosphere-vignette" />
      <div className="page-atmosphere-grain" />
    </div>
    <div className={`page-atmosphere-controls ${custom ? "has-custom-art" : ""}`}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
      <button type="button" onClick={() => fileRef.current?.click()} aria-label={`更换${title}背景`}><span aria-hidden="true">◐</span> 更换本页背景</button>
      {custom && <button type="button" className="page-atmosphere-reset" onClick={() => void reset()}>恢复默认</button>}
      <small aria-live="polite">{status || "仅保存在当前设备"}</small>
    </div>
  </>;
}
