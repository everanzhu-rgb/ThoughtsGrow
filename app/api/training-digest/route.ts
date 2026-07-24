type DigestItem = { id: string; title: string; excerpt: string; url: string; source: string; domain: string; publishedAt: string; reason: string };

function strip(value: string) { return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim(); }
function tag(block: string, name: string) { return strip(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || ""); }

async function hackerNews(): Promise<DigestItem | null> {
  const top = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(8000) }).then((r) => r.json()) as number[];
  for (const id of top.slice(0, 8)) { const item = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(6000) }).then((r) => r.json()) as { title?: string; url?: string; text?: string; time?: number; score?: number }; if (item?.title && (item.url || item.text)) return { id: `hn-${id}`, title: item.title, excerpt: strip(item.text || `这是一则正在 Hacker News 前列讨论的外部文章，当前热度 ${item.score || 0}。请先阅读原文，再区分事实、观点与推断。`), url: item.url || `https://news.ycombinator.com/item?id=${id}`, source: "Hacker News", domain: "科技 / 观点", publishedAt: new Date((item.time || Date.now() / 1000) * 1000).toISOString(), reason: "它正在形成跨背景讨论，适合训练观点、信息来源与反方解释。" }; }
  return null;
}

async function arxiv(): Promise<DigestItem | null> {
  const xml = await fetch("https://export.arxiv.org/api/query?search_query=cat:cs.AI&start=0&max_results=3&sortBy=submittedDate&sortOrder=descending", { headers: { "User-Agent": "XuliThoughtLab/1.0" }, signal: AbortSignal.timeout(12000) }).then((r) => r.text());
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1]; if (!entry) return null; const url = tag(entry, "id");
  return { id: `arxiv-${url.split("/").pop()}`, title: tag(entry, "title"), excerpt: tag(entry, "summary").slice(0, 900), url, source: "arXiv", domain: "论文 / 人工智能", publishedAt: tag(entry, "published") || new Date().toISOString(), reason: "最新论文摘要信息密度高，适合训练概念精确性、证据边界与研究假设。" };
}

async function bbc(): Promise<DigestItem | null> {
  const xml = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml", { signal: AbortSignal.timeout(10000) }).then((r) => r.text()); const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1]; if (!item) return null;
  return { id: `bbc-${crypto.randomUUID()}`, title: tag(item, "title"), excerpt: tag(item, "description").slice(0, 900), url: tag(item, "link"), source: "BBC News", domain: "世界 / 新闻", publishedAt: new Date(tag(item, "pubDate") || Date.now()).toISOString(), reason: "当天新闻适合训练信息核验、重要性排序、利益相关者与长期后果分析。" };
}

export async function GET() {
  const settled = await Promise.allSettled([hackerNews(), arxiv(), bbc()]); const items = settled.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  return Response.json({ items, fetchedAt: new Date().toISOString(), partial: items.length < 3 }, { headers: { "Cache-Control": "public, max-age=900" } });
}
