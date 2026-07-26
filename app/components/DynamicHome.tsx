"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from "react";

type Quote = { quote: string; translation: string; author: string; source: string; language: string };
type Favorite = Quote & { id: string };

const DEFAULT_HERO_IMAGE = "/visuals/xuli-female-portrait-hero.png";
const HERO_IMAGE_STORAGE_KEY = "xuli:home-hero-image:v1";
const HERO_VISIBILITY_STORAGE_KEY = "xuli:home-hero-visibility:v1";

async function prepareHeroImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("无法读取这张图片"));
      image.src = objectUrl;
    });
    const maxWidth = 2200;
    const maxHeight = 1400;
    const scale = Math.min(1, maxWidth / source.naturalWidth, maxHeight / source.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法处理这张图片");
    context.fillStyle = "#080809";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const quotes: Quote[] = [
  { quote: "我们不是在寻找一条永远正确的路，而是在练习随时校正方向。", translation: "", author: "序理", source: "《序理》产品引言 · 原创", language: "zh" },
  { quote: "The unexamined life is not worth living.", translation: "未经省察的人生，不值得过。", author: "Plato", source: "Apology · 38a", language: "en" },
  { quote: "Il faut cultiver notre jardin.", translation: "我们必须耕耘自己的园地。", author: "Voltaire", source: "Candide · Chapter 30", language: "fr" },
  { quote: "Sapere aude.", translation: "敢于求知。", author: "Horace", source: "Epistles · I.2.40", language: "la" },
  { quote: "你不必一次看见整片森林，先辨认脚下这棵树的纹理。", translation: "", author: "序理", source: "《序理》每日札记 · 原创", language: "zh" },
  { quote: "思考的锋芒，不在于迅速反驳，而在于允许事实改变自己。", translation: "", author: "序理", source: "《序理》每日札记 · 原创", language: "zh" },
];

type HomeTarget = "framework" | "knowledge" | "analyze" | "history" | "records" | "growth" | "topics" | "new" | "cabinet";

export function DynamicHome({ records, imports, topicCount, versionCount, onNavigate }: {
  records: Array<{ id: string; title: string; createdAt: string }>;
  imports: Array<{ id: string; disposition: string }>;
  topicCount: number;
  versionCount: number;
  onNavigate(page: HomeTarget): void;
}) {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Date.now() / 86_400_000) % quotes.length);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [saving, setSaving] = useState(false);
  const [heroImage, setHeroImage] = useState(DEFAULT_HERO_IMAGE);
  const [customHero, setCustomHero] = useState(false);
  const [heroImageStatus, setHeroImageStatus] = useState("");
  const [heroVisibility, setHeroVisibility] = useState(.78);
  const heroRef = useRef<HTMLElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const rawPointer = useRef({ x: -999, y: -999 });
  const smoothPointer = useRef({ x: -999, y: -999 });
  const current = quotes[quoteIndex];
  const favorite = favorites.find((item) => item.quote === current.quote);

  useEffect(() => {
    fetch("/api/favorites").then((response) => response.ok ? response.json() : null).then((data) => setFavorites(data?.favorites ?? [])).catch(() => undefined);
    const timer = window.setInterval(() => setQuoteIndex((index) => (index + 1) % quotes.length), 300_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = window.localStorage.getItem(HERO_IMAGE_STORAGE_KEY);
      const storedVisibility = Number(window.localStorage.getItem(HERO_VISIBILITY_STORAGE_KEY));
      if (stored) {
        window.setTimeout(() => {
          if (cancelled) return;
          setHeroImage(stored);
          setCustomHero(true);
        }, 0);
      }
      if (storedVisibility >= .45 && storedVisibility <= 1) window.setTimeout(() => { if (!cancelled) setHeroVisibility(storedVisibility); }, 0);
    } catch {
      // A blocked browser preference store should not prevent the home page from loading.
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      const section = heroRef.current;
      smoothPointer.current.x += (rawPointer.current.x - smoothPointer.current.x) * 0.1;
      smoothPointer.current.y += (rawPointer.current.y - smoothPointer.current.y) * 0.1;
      if (section) {
        section.style.setProperty("--spot-x", `${smoothPointer.current.x}px`);
        section.style.setProperty("--spot-y", `${smoothPointer.current.y}px`);
        section.style.setProperty("--mx", `${smoothPointer.current.x}px`);
        section.style.setProperty("--my", `${smoothPointer.current.y}px`);
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const activeDays = useMemo(() => new Set(records.map((item) => item.createdAt.slice(0, 10))).size, [records]);

  async function toggleFavorite() {
    setSaving(true);
    try {
      if (favorite) {
        const response = await fetch("/api/favorites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: favorite.id }) });
        if (response.ok) setFavorites((items) => items.filter((item) => item.id !== favorite.id));
      } else {
        const response = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(current) });
        const data = await response.json();
        if (response.ok && data.favorite) setFavorites((items) => [data.favorite, ...items]);
      }
    } finally { setSaving(false); }
  }

  function trackPointer(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    rawPointer.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function leaveHero() {
    rawPointer.current = { x: -999, y: -999 };
    smoothPointer.current = { x: -999, y: -999 };
    heroRef.current?.style.setProperty("--spot-x", "-999px");
    heroRef.current?.style.setProperty("--spot-y", "-999px");
  }

  async function uploadHeroImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setHeroImageStatus("请选择 JPG、PNG 或 WebP 图片。");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setHeroImageStatus("图片请控制在 15 MB 以内。");
      return;
    }
    setHeroImageStatus("正在整理光影与尺寸…");
    try {
      const prepared = await prepareHeroImage(file);
      setHeroImage(prepared);
      setCustomHero(true);
      try {
        window.localStorage.setItem(HERO_IMAGE_STORAGE_KEY, prepared);
        setHeroImageStatus("已保存为这台设备的首页主视觉");
      } catch {
        setHeroImageStatus("图片已应用；浏览器空间不足，刷新后可能恢复默认");
      }
    } catch (error) {
      setHeroImageStatus(error instanceof Error ? error.message : "图片处理失败，请换一张试试。");
    } finally {
      event.target.value = "";
    }
  }

  function resetHeroImage() {
    try {
      window.localStorage.removeItem(HERO_IMAGE_STORAGE_KEY);
    } catch {
      // The visual can still be reset for the current session.
    }
    setHeroImage(DEFAULT_HERO_IMAGE);
    setCustomHero(false);
    setHeroImageStatus("已恢复序理默认雕塑");
  }

  const portals: Array<{ page: HomeTarget; code: string; title: string; note: string }> = [
    { page: "framework", code: "01", title: "观星台", note: "看见体系全貌" },
    { page: "cabinet", code: "02", title: "拾光橱", note: "陈列喜欢的句与图" },
    { page: "analyze", code: "03", title: "观照室", note: "用体系照见问题" },
    { page: "records", code: "04", title: "行思录", note: "回到真实思考" },
    { page: "growth", code: "05", title: "生长谱", note: "观察长期证据" },
    { page: "topics", code: "06", title: "磨砺场", note: "把缺口练成习惯" },
  ];

  function changeHeroVisibility(value: number) {
    setHeroVisibility(value);
    try { window.localStorage.setItem(HERO_VISIBILITY_STORAGE_KEY, String(value)); } catch { /* session-only */ }
  }

  const heroStyle = {
    "--home-hero-image": `url("${heroImage}")`,
    "--home-art-brightness": .48 + heroVisibility * .48,
    "--home-reveal-brightness": .7 + heroVisibility * .38,
  } as CSSProperties;

  return <div className="home-stage">
    <section ref={heroRef} className={`home-hero ${customHero ? "has-custom-art" : ""}`} style={heroStyle} onPointerMove={trackPointer} onPointerLeave={leaveHero}>
      <div className="home-hero-reveal" aria-hidden="true" />
      <div className="home-film-grain" aria-hidden="true" />
      <div className="home-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="home-orbit" aria-hidden="true"><span /><span /><span /></div>
      <div className="home-hero-copy">
        <span className="home-overline">XULI / PERSONAL THINKING OS</span>
        <h1 className="gothic-display-title home-gothic-title">Order the Mind,<br /><em>Let Method Grow.</em></h1>
        <p>今天不必完成整座体系。留下一个真实问题，或者带回一则值得反复检点的思想。</p>
        <div className="home-primary-actions"><button className="home-launch" onClick={() => onNavigate("new")}><span>＋</span>开始一次思考</button><button className="home-quiet-link" onClick={() => onNavigate("framework")}>进入思维基座 <span>↗</span></button></div>
        <div className="home-art-controls">
          <input ref={heroFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadHeroImage} />
          <label className="home-visibility-control"><span>背景可见度</span><input type="range" min="45" max="100" step="1" value={Math.round(heroVisibility * 100)} onChange={(event) => changeHeroVisibility(Number(event.target.value) / 100)} aria-label="首页背景可见度" /><output>{Math.round(heroVisibility * 100)}%</output></label>
          <button type="button" onClick={() => heroFileRef.current?.click()}><span aria-hidden="true">◌</span>{customHero ? "更换我的主视觉" : "上传我的主视觉"}</button>
          {customHero && <button type="button" className="home-art-reset" onClick={resetHeroImage}>恢复默认</button>}
          <small aria-live="polite">{heroImageStatus || "图片只保存在当前设备，不会上传到服务器"}</small>
        </div>
      </div>
      <div className="home-data-constellation">
        <div><small>记录</small><strong>{records.length}</strong><span>THOUGHTS</span></div>
        <div><small>材料</small><strong>{imports.length}</strong><span>SOURCES</span></div>
        <div><small>收藏</small><strong>{favorites.length}</strong><span>KEEPSAKES</span></div>
        <div><small>活跃日</small><strong>{activeDays}</strong><span>ACTIVE DAYS</span></div>
        <div><small>版本 / 专题</small><strong>{Math.max(versionCount, 1)} · {topicCount}</strong><span>EVOLUTION</span></div>
      </div>
    </section>
    <section className="home-portals" aria-label="功能入口">{portals.map((portal) => <button key={portal.page} onClick={() => onNavigate(portal.page)}><span>{portal.code}</span><div><strong>{portal.title}</strong><small>{portal.note}</small></div><i>↗</i></button>)}</section>
    <section className="home-bottom-grid">
      <article className="home-quote-card">
        <div className="quote-progress"><i key={quoteIndex} /></div>
        <span>{current.language.toUpperCase()} · 今日漂流句</span>
        <blockquote>“{current.quote}”</blockquote>
        {current.translation && <p className="quote-translation">{current.translation}</p>}
        <footer><small>— {current.author} · {current.source}</small><div><button aria-label="换一句" onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)}>↻</button><button className={favorite ? "active" : ""} disabled={saving} onClick={toggleFavorite}>{favorite ? "已收藏 ♥" : "快速收藏 ♡"}</button></div></footer>
      </article>
      <article className="home-recent-card"><span>RECENT TRACE</span><h2>最近留下的三道痕迹</h2>{records.slice(0, 3).map((record, index) => <button key={record.id} onClick={() => onNavigate("records")}><span>0{index + 1}</span><strong>{record.title}</strong><small>{new Date(record.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</small></button>)}{!records.length && <p>还没有记录。第一道痕迹正等你落笔。</p>}</article>
    </section>
  </div>;
}
