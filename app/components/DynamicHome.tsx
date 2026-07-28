"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from "react";

type Quote = { quote: string; translation: string; author: string; source: string; sourceUrl: string; language: string; era: "古典" | "现代" | "当代" };
type Favorite = Quote & { id: string };

const DEFAULT_HERO_IMAGE = "/visuals/xuli-female-portrait-hero.png";
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
  { quote: "学而不思则罔，思而不学则殆。", translation: "", author: "孔子", source: "《论语·为政》", sourceUrl: "https://ctext.org/analects/wei-zheng/zh", language: "zh", era: "古典" },
  { quote: "The life which is unexamined is not worth living.", translation: "未经省察的人生，不值得过。", author: "Socrates / Plato", source: "Apology", sourceUrl: "https://classics.mit.edu/Plato/apology.html", language: "en", era: "古典" },
  { quote: "知人者智，自知者明。", translation: "", author: "老子", source: "《道德经》第三十三章", sourceUrl: "https://ctext.org/dao-de-jing/zh", language: "zh", era: "古典" },
  { quote: "Il faut cultiver notre jardin.", translation: "我们必须耕耘自己的园地。", author: "Voltaire", source: "Candide · Chapter 30", sourceUrl: "https://www.gutenberg.org/ebooks/19942", language: "fr", era: "现代" },
  { quote: "尽信书，则不如无书。", translation: "", author: "孟子", source: "《孟子·尽心下》", sourceUrl: "https://ctext.org/mengzi/jin-xin-ii/zh", language: "zh", era: "古典" },
  { quote: "Sapere aude! Have courage to use your own understanding.", translation: "敢于运用你自己的理性。", author: "Immanuel Kant", source: "What Is Enlightenment?", sourceUrl: "https://en.wikisource.org/wiki/What_is_Enlightenment%3F", language: "en", era: "现代" },
  { quote: "There is no courage without vulnerability.", translation: "没有脆弱，就没有勇气。", author: "Brené Brown", source: "Taken for Granted · TED, 2021", sourceUrl: "https://www.ted.com/podcasts/brene-brown-on-what-vulnerability-isnt-transcript", language: "en", era: "当代" },
  { quote: "You do not rise to the level of your goals. You fall to the level of your systems.", translation: "你不会上升到目标的高度，而会落到系统的水平。", author: "James Clear", source: "Atomic Habits", sourceUrl: "https://jamesclear.com/quotes/you-do-not-rise-to-the-level-of-your-goals-you-fall-to-the-level-of-your-systems", language: "en", era: "当代" },
  { quote: "凡事豫则立，不豫则废。", translation: "", author: "《礼记》", source: "《中庸》", sourceUrl: "https://ctext.org/liji/zhong-yong/zh", language: "zh", era: "古典" },
  { quote: "He who has a why to live can bear almost any how.", translation: "知道为何而活的人，几乎能承受任何生活方式。", author: "Friedrich Nietzsche", source: "Twilight of the Idols", sourceUrl: "https://www.gutenberg.org/ebooks/52263", language: "en", era: "现代" },
];

function compactDuration(seconds: number) {
  if (seconds < 3600) return { value: String(seconds ? Math.max(1, Math.floor(seconds / 60)) : 0), unit: "min" };
  const hours = seconds / 3600;
  return { value: (hours < 10 ? hours.toFixed(1) : Math.round(hours).toString()).replace(/\.0$/, ""), unit: "h" };
}

type HomeTarget = "framework" | "knowledge" | "analyze" | "history" | "records" | "growth" | "topics" | "new" | "cabinet";

export function DynamicHome({ records, topicCount, versionCount, usageTotalSeconds, sceneryFocus, onSceneryFocusChange, onNavigate }: {
  records: Array<{ id: string; title: string; createdAt: string }>;
  topicCount: number;
  versionCount: number;
  usageTotalSeconds: number;
  sceneryFocus: number;
  onSceneryFocusChange(value: number): void;
  onNavigate(page: HomeTarget): void;
}) {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Date.now() / 86_400_000) % quotes.length);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [saving, setSaving] = useState(false);
  const [heroImage, setHeroImage] = useState(DEFAULT_HERO_IMAGE);
  const [serverImage, setServerImage] = useState<string | null>(null);
  const [customHero, setCustomHero] = useState(false);
  const [heroImageStatus, setHeroImageStatus] = useState("");
  const [heroVisibility, setHeroVisibility] = useState(.78);
  const heroRef = useRef<HTMLElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const heroServerFileRef = useRef<HTMLInputElement>(null);
  const rawPointer = useRef({ x: -999, y: -999 });
  const smoothPointer = useRef({ x: -999, y: -999 });
  const current = quotes[quoteIndex];
  const favorite = favorites.find((item) => item.quote === current.quote);
  const usageDuration = compactDuration(usageTotalSeconds);

  useEffect(() => {
    fetch("/api/favorites").then((response) => response.ok ? response.json() : null).then((data) => setFavorites(data?.favorites ?? [])).catch(() => undefined);
    const timer = window.setInterval(() => setQuoteIndex((index) => (index + 1) % quotes.length), 300_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    try {
      const storedVisibility = Number(window.localStorage.getItem(HERO_VISIBILITY_STORAGE_KEY));
      if (storedVisibility >= .45 && storedVisibility <= 1) window.setTimeout(() => { if (!cancelled) setHeroVisibility(storedVisibility); }, 0);
    } catch {
      // A blocked browser preference store should not prevent the home page from loading.
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/visual-settings?page=dashboard").then((response) => response.ok ? response.json() : null).then((data) => {
      if (cancelled || !data?.imageUrl) return;
      setServerImage(data.imageUrl);
      setHeroImage(data.imageUrl);
      setCustomHero(true);
    }).catch(() => undefined);
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
      setHeroImageStatus("已暂存为本次访问的导航页壁纸；刷新后恢复服务器版本");
    } catch (error) {
      setHeroImageStatus(error instanceof Error ? error.message : "图片处理失败，请换一张试试。");
    } finally {
      event.target.value = "";
    }
  }

  async function uploadHeroToServer(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) {
      setHeroImageStatus("请选择 15 MB 以内的 JPG、PNG 或 WebP 图片。");
      event.target.value = "";
      return;
    }
    setHeroImageStatus("正在上传服务器并设为导航页壁纸…");
    try {
      const response = await fetch("/api/visual-settings/image", { method: "POST", headers: { "Content-Type": file.type, "X-Page": "dashboard", "X-File-Size": String(file.size) }, body: file });
      const data = await response.json().catch(() => ({})) as { imageUrl?: string; error?: string; requestId?: string };
      if (!response.ok || !data.imageUrl) throw new Error(`${data.error || "上传失败"}${data.requestId ? `；请求编号：${data.requestId}` : ""}`);
      setServerImage(data.imageUrl);
      setHeroImage(data.imageUrl);
      setCustomHero(true);
      setHeroImageStatus("已上传服务器，并设为导航页共享壁纸");
    } catch (error) {
      setHeroImageStatus(error instanceof Error ? error.message : "服务器上传失败");
    } finally {
      event.target.value = "";
    }
  }

  function resetHeroImage() {
    setHeroImage(serverImage || DEFAULT_HERO_IMAGE);
    setCustomHero(Boolean(serverImage));
    setHeroImageStatus(serverImage ? "已恢复服务器壁纸" : "已恢复序理默认雕塑");
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
        <div className="home-primary-actions"><button className="home-launch" onClick={() => onNavigate("new")}><span>＋</span>开始一次思考</button><button className="home-quiet-link" onClick={() => onNavigate("framework")}>进入思维基座 <span>↗</span></button></div>
        <div className="home-art-controls">
          <input ref={heroFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadHeroImage} />
          <input ref={heroServerFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadHeroToServer} />
          <label className="home-visibility-control"><span>壁纸</span><input type="range" min="45" max="100" step="1" value={Math.round(heroVisibility * 100)} onChange={(event) => changeHeroVisibility(Number(event.target.value) / 100)} aria-label="首页背景可见度" /><output>{Math.round(heroVisibility * 100)}%</output></label>
          <label className="home-scenery-control"><span>赏景</span><input type="range" min="0" max="100" step="1" value={sceneryFocus} onChange={(event) => onSceneryFocusChange(Number(event.target.value))} aria-label="首页内容透明度" /><output>{sceneryFocus}%</output></label>
          <button type="button" aria-label="本次暂存壁纸" onClick={() => heroFileRef.current?.click()}><span aria-hidden="true">◌</span>暂存</button>
          <button type="button" aria-label="上传壁纸到服务器" onClick={() => heroServerFileRef.current?.click()}><span aria-hidden="true">⇧</span>云端</button>
          {customHero && <button type="button" className="home-art-reset" aria-label="恢复默认壁纸" onClick={resetHeroImage}>重置</button>}
          <small aria-live="polite">{heroImageStatus || "可只在本次访问暂存，也可上传为共享壁纸"}</small>
        </div>
      </div>
      <div className="home-data-constellation">
        <div><small>记录</small><strong>{records.length}</strong><span>THOUGHTS</span></div>
        <div><small>所用时间</small><strong>{usageDuration.value}</strong><span>TIME · {usageDuration.unit}</span></div>
        <div><small>收藏</small><strong>{favorites.length}</strong><span>KEEPSAKES</span></div>
        <div><small>活跃日</small><strong>{activeDays}</strong><span>ACTIVE DAYS</span></div>
        <div><small>版本 / 专题</small><strong>{Math.max(versionCount, 1)} · {topicCount}</strong><span>EVOLUTION</span></div>
      </div>
    </section>
    <section className="home-portals" aria-label="功能入口">{portals.map((portal) => <button key={portal.page} onClick={() => onNavigate(portal.page)}><span>{portal.code}</span><div><strong>{portal.title}</strong><small>{portal.note}</small></div><i>↗</i></button>)}</section>
    <section className="home-bottom-grid">
      <article className="home-quote-card">
        <div className="quote-progress"><i key={quoteIndex} /></div>
        <span>{current.language.toUpperCase()} · {current.era} · 今日漂流句</span>
        <blockquote>“{current.quote}”</blockquote>
        {current.translation && <p className="quote-translation">{current.translation}</p>}
        <footer><small>— {current.author} · <a href={current.sourceUrl} target="_blank" rel="noreferrer">{current.source} ↗</a></small><div><button aria-label="换一句" onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)}>↻</button><button className={favorite ? "active" : ""} disabled={saving} onClick={toggleFavorite}>{favorite ? "已收藏 ♥" : "快速收藏 ♡"}</button></div></footer>
      </article>
      <article className="home-recent-card"><span>RECENT TRACE</span><h2>最近留下的三道痕迹</h2>{records.slice(0, 3).map((record, index) => <button key={record.id} onClick={() => onNavigate("records")}><span>0{index + 1}</span><strong>{record.title}</strong><small>{new Date(record.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</small></button>)}{!records.length && <p>还没有记录。第一道痕迹正等你落笔。</p>}</article>
    </section>
  </div>;
}
