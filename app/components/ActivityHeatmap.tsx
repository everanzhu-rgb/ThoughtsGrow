"use client";

import { useMemo, useState } from "react";

type DayItem = { kind: string; summary: string; at: string };
type ActivityStat = { label: string; value: string; note: string; unit?: string };

function dateKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDuration(seconds: number) {
  if (seconds < 3600) return `${seconds ? Math.max(1, Math.floor(seconds / 60)) : 0} min`;
  const hours = seconds / 3600;
  return `${(hours < 10 ? hours.toFixed(1) : Math.round(hours).toString()).replace(/\.0$/, "")} h`;
}

export function ActivityHeatmap({ byDay, usageByDay = {}, days = 60, stats = [] }: { byDay: Record<string, DayItem[]>; usageByDay?: Record<string, number>; days?: number; stats?: ActivityStat[] }) {
  const dates = useMemo(() => Array.from({ length: days }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (days - 1 - index)); return date;
  }), [days]);
  const initialKey = [...dates].reverse().map(dateKey).find((key) => byDay[key]?.length || usageByDay[key]) || dateKey(dates.at(-1)!);
  const [focusedKey, setFocusedKey] = useState(initialKey);
  const focusedDate = dates.find((date) => dateKey(date) === focusedKey) || dates.at(-1)!;
  const focusedItems = byDay[focusedKey] || [];
  const focusedUsage = usageByDay[focusedKey] || 0;
  const maxUsage = Math.max(1, ...dates.map((date) => usageByDay[dateKey(date)] || 0));

  return <section className="activity-card featured-activity card">
    <div className="activity-head"><div><span className="eyebrow">ACTIVITY CONSTELLATION · 学习活动星图</span><h2 className="gothic-section-title">Learning<br /><span>Constellation</span></h2><p>每一格都是一天。移动或聚焦光点，在右侧阅读当天留下的记录、导入与训练。</p></div><div className="heat-legend"><span>静</span><i /><i /><i /><i /><span>丰</span></div></div>
    <div className="heat-stage">
      <div className="heatmap-grid" role="grid" aria-label={`最近 ${days} 天活跃度`}>
        {dates.map((date) => { const key = dateKey(date); const items = byDay[key] || []; const level = Math.min(4, items.length); return <button type="button" aria-label={`${date.toLocaleDateString("zh-CN")}，${items.length} 项活动`} className={`heat-cell heat-${level} ${focusedKey === key ? "focused" : ""}`} key={key} onMouseEnter={() => setFocusedKey(key)} onFocus={() => setFocusedKey(key)} onClick={() => setFocusedKey(key)}><i /></button>; })}
      </div>
      <aside className="activity-side" aria-live="polite">{stats.length > 0 && <div className="activity-stats">{stats.map((stat) => <div key={stat.label} title={stat.note}><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.unit ? `TIME · ${stat.unit}` : stat.note}</small></div>)}</div>}<div className="heat-focus" key={focusedKey}><span>{focusedDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span><strong>{focusedItems.length ? `${focusedItems.length} 类学习活动` : "安静的一天"}</strong><small className="focused-usage">当日使用 · {formatDuration(focusedUsage)}</small><div>{focusedItems.length ? focusedItems.slice(0, 4).map((item, index) => <p key={`${item.kind}-${index}`}><i>{item.kind}</i>{item.summary}</p>) : <p>没有记录也不意味着停滞。下一次回来时，从一个真实问题开始。</p>}</div></div></aside>
    </div>
    <div className="daily-usage-strip"><header><span>DAILY TIME · 每日使用时间</span><strong>选中热力图日期即可联动查看</strong></header><div>{dates.map((date) => { const key = dateKey(date); const seconds = usageByDay[key] || 0; return <button key={key} className={focusedKey === key ? "active" : ""} onClick={() => setFocusedKey(key)} aria-label={`${date.toLocaleDateString("zh-CN")}使用 ${formatDuration(seconds)}`}><i style={{ height: `${Math.max(3, seconds / maxUsage * 100)}%` }} /><span>{date.getDate()}</span></button>; })}</div></div>
  </section>;
}
