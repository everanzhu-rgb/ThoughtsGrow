type DigestItem = { id: string; title: string; excerpt: string; url: string; source: string; domain: string; publishedAt: string; reason: string; trainingFocus: string };

function strip(value: string) { return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim(); }
function tag(block: string, name: string) { return strip(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || ""); }

async function hackerNews(): Promise<DigestItem | null> {
  const top = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(8000) }).then((r) => r.json()) as number[];
  for (const id of top.slice(0, 8)) { const item = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(6000) }).then((r) => r.json()) as { title?: string; url?: string; text?: string; time?: number; score?: number }; if (item?.title && (item.url || item.text)) return { id: `hn-${id}`, title: item.title, excerpt: strip(item.text || `这是一则正在 Hacker News 前列讨论的外部文章，当前热度 ${item.score || 0}。请先阅读原文，再区分事实、观点与推断。`), url: item.url || `https://news.ycombinator.com/item?id=${id}`, source: "Hacker News", domain: "科技 / 观点", publishedAt: new Date((item.time || Date.now() / 1000) * 1000).toISOString(), reason: "它正在形成跨背景讨论，适合观察不同立场如何使用信息。", trainingFocus: "区分事实、观点与推断；重建最强反方观点；检查信息来源与隐含假设。" }; }
  return null;
}

async function arxiv(): Promise<DigestItem | null> {
  const xml = await fetch("https://export.arxiv.org/api/query?search_query=cat:cs.AI&start=0&max_results=3&sortBy=submittedDate&sortOrder=descending", { headers: { "User-Agent": "XuliThoughtLab/1.0" }, signal: AbortSignal.timeout(12000) }).then((r) => r.text());
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1]; if (!entry) return null; const url = tag(entry, "id");
  return { id: `arxiv-${url.split("/").pop()}`, title: tag(entry, "title"), excerpt: tag(entry, "summary").slice(0, 900), url, source: "arXiv", domain: "论文 / 人工智能", publishedAt: tag(entry, "published") || new Date().toISOString(), reason: "最新论文摘要信息密度高，能暴露概念、证据与结论之间的距离。", trainingFocus: "澄清核心概念；区分研究假设与已有证据；判断结论是否超出实验边界。" };
}

async function bbc(): Promise<DigestItem | null> {
  const xml = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml", { signal: AbortSignal.timeout(10000) }).then((r) => r.text()); const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1]; if (!item) return null;
  return { id: `bbc-${crypto.randomUUID()}`, title: tag(item, "title"), excerpt: tag(item, "description").slice(0, 900), url: tag(item, "link"), source: "BBC News", domain: "世界 / 新闻", publishedAt: new Date(tag(item, "pubDate") || Date.now()).toISOString(), reason: "当天新闻能把体系放进真实、信息仍在变化的公共事件中检验。", trainingFocus: "核验信息；识别利益相关者；区分短期结果与长期意义；检查报道视角。" };
}

async function nasa(): Promise<DigestItem | null> {
  const xml = await fetch("https://www.nasa.gov/news-release/feed/", { signal: AbortSignal.timeout(10000) }).then((response) => response.text());
  const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
  if (!item) return null;
  const url = tag(item, "link");
  return {
    id: `nasa-${url.split("/").filter(Boolean).pop() || crypto.randomUUID()}`,
    title: tag(item, "title"),
    excerpt: tag(item, "description").slice(0, 900),
    url,
    source: "NASA",
    domain: "科学 / 太空",
    publishedAt: new Date(tag(item, "pubDate") || Date.now()).toISOString(),
    reason: "科学机构的一手发布适合训练如何区分观测、模型、推断与传播表达。",
    trainingFocus: "识别一手证据；区分发现与解释；检查结论的适用边界与尚未回答的问题。",
  };
}

async function guardian(): Promise<DigestItem | null> {
  const xml = await fetch("https://www.theguardian.com/world/rss", { signal: AbortSignal.timeout(10000) }).then((response) => response.text());
  const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
  if (!item) return null;
  const url = tag(item, "link");
  return {
    id: `guardian-${url.split("/").filter(Boolean).pop() || crypto.randomUUID()}`,
    title: tag(item, "title"),
    excerpt: tag(item, "description").slice(0, 900),
    url,
    source: "The Guardian",
    domain: "世界 / 观点",
    publishedAt: new Date(tag(item, "pubDate") || Date.now()).toISOString(),
    reason: "它提供与其他新闻源不同的叙事选择，适合比较框架、立场与信息取舍。",
    trainingFocus: "寻找报道框架；识别缺失视角；比较标题、证据与结论之间的距离。",
  };
}

const CURATED_FALLBACKS: DigestItem[] = [
  {
    id: "fallback-critical-thinking",
    title: "How to Read a Paper",
    excerpt: "S. Keshav 提出的三遍阅读法，将论文阅读拆成全貌判断、结构理解与证据复核三个层次，可作为科研阅读的可执行训练材料。",
    url: "https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf",
    source: "University of Waterloo / Stanford",
    domain: "科研 / 方法",
    publishedAt: "2007-01-01T00:00:00.000Z",
    reason: "当实时来源暂时不可用时，用经典方法文本保证当天仍有完整的第三个训练入口。",
    trainingFocus: "把阅读目标程序化；区分略读、理解与复核；检验方法是否能迁移到自己的领域。",
  },
  {
    id: "fallback-feynman",
    title: "Cargo Cult Science",
    excerpt: "Richard Feynman 讨论科学诚实、反例披露与自我欺骗，是检验准确性、公正性和证据边界的经典文本。",
    url: "https://calteches.library.caltech.edu/51/2/CargoCult.htm",
    source: "Caltech",
    domain: "科学 / 方法论",
    publishedAt: "1974-01-01T00:00:00.000Z",
    reason: "经典演讲能补充即时资讯的短周期视角，并训练如何发现研究叙事中的选择性呈现。",
    trainingFocus: "寻找被省略的反例；检查自我欺骗；重建作者对科学诚实的论证链。",
  },
  {
    id: "fallback-media-literacy",
    title: "The Verification Handbook",
    excerpt: "一本面向新闻与公共信息核验的开放手册，提供来源追踪、图像核验与突发事件判断的操作方法。",
    url: "https://verificationhandbook.com/",
    source: "European Journalism Centre",
    domain: "新闻 / 信息核验",
    publishedAt: "2014-01-01T00:00:00.000Z",
    reason: "它能把准确性标准落实为可执行动作，适合作为新闻材料的基础训练。",
    trainingFocus: "追溯原始来源；交叉核验；标记不确定性；避免把传播热度当作证据强度。",
  },
];

export async function GET() {
  const settled = await Promise.allSettled([hackerNews(), arxiv(), bbc(), nasa(), guardian()]);
  const liveItems = settled.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  const unique = [...liveItems, ...CURATED_FALLBACKS].filter((item, index, all) =>
    all.findIndex((candidate) => candidate.url === item.url || candidate.title === item.title) === index,
  );
  const items = unique.slice(0, 3);
  return Response.json({ items, fetchedAt: new Date().toISOString(), partial: liveItems.length < 3 }, { headers: { "Cache-Control": "public, max-age=900" } });
}
