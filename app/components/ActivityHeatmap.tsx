"use client";

import { useMemo, useState } from "react";

type DayItem = { kind: string; summary: string; at: string };

export function ActivityHeatmap({ byDay, days = 60 }: { byDay: Record<string, DayItem[]>; days?: number }) {
  const dates = useMemo(() => Array.from({ length: days }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (days - 1 - index)); return date;
  }), [days]);
  const initialKey = [...dates].reverse().map((date) => date.toISOString().slice(0, 10)).find((key) => byDay[key]?.length) || dates.at(-1)!.toISOString().slice(0, 10);
  const [focusedKey, setFocusedKey] = useState(initialKey);
  const focusedDate = dates.find((date) => date.toISOString().slice(0, 10) === focusedKey) || dates.at(-1)!;
  const focusedItems = byDay[focusedKey] || [];

  return <section className="activity-card featured-activity card">
    <div className="activity-head"><div><span className="eyebrow">ACTIVITY CONSTELLATION</span><h2>学习活动星图</h2><p>每一格都是一天。移动或聚焦光点，在右侧阅读当天留下的记录、导入与训练。</p></div><div className="heat-legend"><span>静</span><i /><i /><i /><i /><span>丰</span></div></div>
    <div className="heat-stage">
      <div className="heatmap-grid" role="grid" aria-label={`最近 ${days} 天活跃度`}>
        {dates.map((date) => { const key = date.toISOString().slice(0, 10); const items = byDay[key] || []; const level = Math.min(4, items.length); return <button type="button" aria-label={`${date.toLocaleDateString("zh-CN")}，${items.length} 项活动`} className={`heat-cell heat-${level} ${focusedKey === key ? "focused" : ""}`} key={key} onMouseEnter={() => setFocusedKey(key)} onFocus={() => setFocusedKey(key)} onClick={() => setFocusedKey(key)}><i /></button>; })}
      </div>
      <aside className="heat-focus" aria-live="polite"><span>{focusedDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span><strong>{focusedItems.length ? `${focusedItems.length} 道学习痕迹` : "安静的一天"}</strong><div>{focusedItems.length ? focusedItems.slice(0, 4).map((item, index) => <p key={`${item.kind}-${index}`}><i>{item.kind}</i>{item.summary}</p>) : <p>没有记录也不意味着停滞。下一次回来时，从一个真实问题开始。</p>}{focusedItems.length > 4 && <small>另有 {focusedItems.length - 4} 项活动</small>}</div></aside>
    </div>
  </section>;
}
