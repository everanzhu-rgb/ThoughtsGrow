"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";

const DEFAULT_ART: Record<string, string> = {
  framework: "/visuals/xuli-framework-portrait.png",
  analyze: "/visuals/xuli-analyze-portrait.png",
  history: "/visuals/xuli-history-portrait.png",
  records: "/visuals/xuli-trash-portrait.png",
  growth: "/visuals/xuli-growth-portrait.png",
  topics: "/visuals/xuli-topics-portrait.png",
  cabinet: "/visuals/xuli-cabinet-portrait.png",
  new: "/visuals/xuli-new-portrait.png",
  trash: "/visuals/xuli-records-portrait.png",
  knowledge: "/visuals/xuli-records-portrait.png",
  integration: "/visuals/xuli-framework-portrait.png",
};

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
  const [serverImage, setServerImage] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [serverUploading, setServerUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [visibility, setVisibility] = useState(.62);
  const [artScale, setArtScale] = useState(1);
  const layerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const serverFileRef = useRef<HTMLInputElement>(null);
  const rawPointer = useRef({ x: -999, y: -999 });
  const smoothPointer = useRef({ x: -999, y: -999 });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/visual-settings?page=${encodeURIComponent(page)}`)
      .then((response) => response.ok ? response.json() as Promise<{ imageUrl?: string | null }> : { imageUrl: null })
      .catch(() => ({ imageUrl: null }))
      .then((remote) => {
      if (cancelled) return;
      const remoteImage = remote.imageUrl || null;
      setServerImage(remoteImage);
      if (remoteImage) {
        setImage(remoteImage);
        setCustom(true);
      } else {
        setImage(defaultArt);
        setCustom(false);
      }
    });
    return () => { cancelled = true; };
  }, [defaultArt, page]);

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

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(`xuli:page-visibility:${page}:v1`));
      if (stored >= .35 && stored <= 1) window.setTimeout(() => setVisibility(stored), 0);
      const storedScale = Number(window.localStorage.getItem(`xuli:page-scale:${page}:v1`));
      if (storedScale >= .65 && storedScale <= 1.6) window.setTimeout(() => setArtScale(storedScale), 0);
    } catch {
      // Display controls remain adjustable for the current session.
    }
  }, [page]);

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
      setStatus(`已临时应用于「${title}」；刷新页面后会恢复`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "图片处理失败，请换一张试试");
    } finally {
      event.target.value = "";
    }
  }

  async function uploadToServer(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setStatus("请选择 15 MB 以内的 JPG、PNG 或 WebP 图片");
      event.target.value = "";
      return;
    }
    setServerUploading(true);
    setStatus("正在上传服务器并设为此页默认背景…");
    try {
      const form = new FormData();
      form.set("page", page);
      form.set("file", file);
      const response = await fetch("/api/visual-settings", { method: "POST", body: form });
      const payload = await response.json() as { imageUrl?: string; error?: string };
      if (!response.ok || !payload.imageUrl) throw new Error(payload.error || "上传失败");
      setServerImage(payload.imageUrl);
      setImage(payload.imageUrl);
      setCustom(true);
      setStatus(`已上传服务器，并设为「${title}」的共享背景`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "服务器上传失败");
    } finally {
      setServerUploading(false);
      event.target.value = "";
    }
  }

  async function reset() {
    setImage(serverImage || defaultArt);
    setCustom(Boolean(serverImage));
    setStatus(serverImage ? "已恢复服务器默认背景" : "已恢复内置雕塑背景");
  }

  function changeVisibility(value: number) {
    setVisibility(value);
    try { window.localStorage.setItem(`xuli:page-visibility:${page}:v1`, String(value)); } catch { /* session-only */ }
  }

  function changeArtScale(value: number) {
    setArtScale(value);
    try { window.localStorage.setItem(`xuli:page-scale:${page}:v1`, String(value)); } catch { /* session-only */ }
  }

  const style = {
    "--page-atmosphere-image": `url("${image}")`,
    "--page-art-opacity": visibility,
    "--page-reveal-opacity": Math.min(1, visibility + .28),
    "--page-art-scale": artScale,
    "--page-art-scale-start": artScale * 1.015,
    "--page-art-scale-end": artScale * 1.055,
  } as CSSProperties;

  return <>
    <div ref={layerRef} className="page-atmosphere" style={style} aria-hidden="true">
      <div className="page-atmosphere-base" />
      <div className="page-atmosphere-reveal" />
      <div className="page-atmosphere-vignette" />
      <div className="page-atmosphere-grain" />
    </div>
    <div className={`page-atmosphere-controls ${custom ? "has-custom-art" : ""}`}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
      <input ref={serverFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadToServer} />
      <label className="page-visibility-control"><span>背景</span><input type="range" min="35" max="100" step="1" value={Math.round(visibility * 100)} onChange={(event) => changeVisibility(Number(event.target.value) / 100)} aria-label={`${title}背景可见度`} /><output>{Math.round(visibility * 100)}%</output></label>
      <label className="page-size-control"><span>大小</span><input type="range" min="65" max="160" step="1" value={Math.round(artScale * 100)} onChange={(event) => changeArtScale(Number(event.target.value) / 100)} aria-label={`${title}背景图片大小`} /><output>{Math.round(artScale * 100)}%</output></label>
      <button type="button" onClick={() => fileRef.current?.click()} aria-label={`临时更换${title}背景`}><span aria-hidden="true">◐</span> 本机更换</button>
      <button type="button" disabled={serverUploading} onClick={() => serverFileRef.current?.click()} aria-label={`上传${title}服务器背景`}><span aria-hidden="true">⇧</span> {serverUploading ? "上传中" : "上传服务器"}</button>
      {custom && <button type="button" className="page-atmosphere-reset" onClick={() => void reset()}>恢复默认</button>}
      <small aria-live="polite">{status || "本机更换仅在本次浏览生效；也可上传为共享背景"}</small>
    </div>
  </>;
}
