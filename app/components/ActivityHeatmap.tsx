"use client";

type DayItem = { kind: string; summary: string; at: string };

export function ActivityHeatmap({ byDay, days = 60 }: { byDay: Record<string, DayItem[]>; days?: number }) {
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    return date;
  });
  return (
    <section className="activity-card card">
      <div className="activity-head"><div><span className="eyebrow">ACTIVITY CONSTELLATION</span><h2>最近六十天的学习光点</h2><p>颜色表示当天留下的有效痕迹数量；悬停可预览记录、导入或训练。</p></div><div className="heat-legend"><span>静</span><i /><i /><i /><i /><span>丰</span></div></div>
      <div className="heatmap-grid" role="grid" aria-label="最近六十天活跃度">
        {dates.map((date) => {
          const key = date.toISOString().slice(0, 10); const items = byDay[key] || []; const level = Math.min(4, items.length);
          return <div className={`heat-cell heat-${level}`} key={key} tabIndex={0}><span className="heat-tooltip"><strong>{date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</strong>{items.length ? items.slice(0, 4).map((item, index) => <small key={`${item.kind}-${index}`}>{item.summary}</small>) : <small>这一天没有留下痕迹</small>}{items.length > 4 && <small>另有 {items.length - 4} 项活动</small>}</span></div>;
        })}
      </div>
    </section>
  );
}
