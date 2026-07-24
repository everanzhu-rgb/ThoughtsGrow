"use client";

import { useEffect, useMemo, useState, type PointerEvent } from "react";

type Quote = { quote: string; translation: string; author: string; source: string; language: string };
type Favorite = Quote & { id: string };

const quotes: Quote[] = [
  { quote: "我们不是在寻找一条永远正确的路，而是在练习随时校正方向。", translation: "", author: "序理", source: "《序理》产品引言 · 原创", language: "zh" },
  { quote: "The unexamined life is not worth living.", translation: "未经省察的人生，不值得过。", author: "Plato", source: "Apology · 38a", language: "en" },
  { quote: "Il faut cultiver notre jardin.", translation: "我们必须耕耘自己的园地。", author: "Voltaire", source: "Candide · Chapter 30", language: "fr" },
  { quote: "Sapere aude.", translation: "敢于求知。", author: "Horace", source: "Epistles · I.2.40", language: "la" },
  { quote: "你不必一次看见整片森林，先辨认脚下这棵树的纹理。", translation: "", author: "序理", source: "《序理》每日札记 · 原创", language: "zh" },
  { quote: "思考的锋芒，不在于迅速反驳，而在于允许事实改变自己。", translation: "", author: "序理", source: "《序理》每日札记 · 原创", language: "zh" },
];

type HomeTarget = "framework" | "knowledge" | "analyze" | "history" | "records" | "growth" | "topics" | "new";

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
  const current = quotes[quoteIndex];
  const favorite = favorites.find((item) => item.quote === current.quote);

  useEffect(() => {
    fetch("/api/favorites").then((response) => response.ok ? response.json() : null).then((data) => setFavorites(data?.favorites ?? [])).catch(() => undefined);
    const timer = window.setInterval(() => setQuoteIndex((index) => (index + 1) % quotes.length), 300_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeDays = useMemo(() => new Set(records.map((item) => item.createdAt.slice(0, 10))).size, [records]);
  const patches = imports.filter((item) => item.disposition === "patch").length;

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
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  const portals: Array<{ page: HomeTarget; code: string; title: string; note: string }> = [
    { page: "framework", code: "01", title: "观星台", note: "看见体系全貌" },
    { page: "knowledge", code: "02", title: "拾穗门", note: "带回新的思想" },
    { page: "analyze", code: "03", title: "观照室", note: "用体系照见问题" },
    { page: "records", code: "04", title: "行思录", note: "回到真实思考" },
    { page: "growth", code: "05", title: "生长谱", note: "观察长期证据" },
    { page: "topics", code: "06", title: "磨砺场", note: "把缺口练成习惯" },
  ];

  return <div className="home-stage">
    <section className="home-hero" onPointerMove={trackPointer}>
      <div className="home-film-grain" aria-hidden="true" />
      <div className="home-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="home-orbit" aria-hidden="true"><span /><span /><span /></div>
      <div className="home-hero-copy">
        <span className="home-overline">XULI / PERSONAL THINKING OS</span>
        <h1>让思想有序，<br /><em>让方法生长。</em></h1>
        <p>今天不必完成整座体系。留下一个真实问题，或者带回一则值得反复检点的思想。</p>
        <div className="home-primary-actions"><button className="home-launch" onClick={() => onNavigate("new")}><span>＋</span>开始一次思考</button><button className="home-quiet-link" onClick={() => onNavigate("framework")}>进入思维基座 <span>↗</span></button></div>
      </div>
      <div className="home-data-constellation">
        <div><small>记录</small><strong>{records.length}</strong><span>THOUGHTS</span></div>
        <div><small>材料</small><strong>{imports.length}</strong><span>SOURCES</span></div>
        <div><small>补丁</small><strong>{patches}</strong><span>PATCHES</span></div>
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
